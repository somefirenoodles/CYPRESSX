import { readFile } from 'node:fs/promises';
import oracledb from 'oracledb';
import { closePool, withConnection, withTransaction } from './oracle';
import { splitMigration } from './sql-script';

async function main() {
  if (process.env.SUPERPAY_TEST_DATABASE !== 'disposable') throw new Error('La fixture de actualización solo se permite en una base desechable de pruebas.');
  const initial = await readFile('database/migrations/001_initial.sql', 'utf8');
  await withConnection(async (connection) => {
    // Intentionally fail if the database already contains this schema: never reuse application data.
    for (const statement of splitMigration(initial)) await connection.execute(statement);
    await connection.execute('CREATE TABLE cx_schema_migrations (version VARCHAR2(120 CHAR) PRIMARY KEY, applied_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL)');
  });
  await withTransaction(async (connection) => {
    const idBind = () => ({ dir: oracledb.BIND_OUT, type: oracledb.NUMBER });
    const insertedUser = await connection.execute(`INSERT INTO cx_users(username,email,password_hash,first_name,last_name)
      VALUES ('legacy_upgrade_fixture','legacy-upgrade@example.test','not-loginable-test-fixture','Legacy','Fixture') RETURNING id INTO :id`, { id: idBind() });
    const userId = Number((insertedUser.outBinds as { id: number[] }).id[0]);
    const insertedAccount = await connection.execute("INSERT INTO cx_accounts(user_id,currency,balance_minor) VALUES (:userId,'USD',12345) RETURNING id INTO :id", { userId, id: idBind() });
    const accountId = Number((insertedAccount.outBinds as { id: number[] }).id[0]);
    const insertedOperation = await connection.execute(`INSERT INTO cx_operations(user_id,operation_type,idempotency_key,from_currency,to_currency,from_amount_minor,to_amount_minor,status,description)
      VALUES (:userId,'sandbox_topup','legacy-upgrade-fixture','USD','USD',12345,12345,'completed','Fixture anterior al ledger autoritativo') RETURNING id INTO :id`, { userId, id: idBind() });
    const operationId = Number((insertedOperation.outBinds as { id: number[] }).id[0]);
    await connection.execute("INSERT INTO cx_ledger_entries(operation_id,account_id,currency,amount_minor,entry_type) VALUES (:operationId,:accountId,'USD',12345,'sandbox_funding')", { operationId, accountId });
    await connection.execute("INSERT INTO cx_ledger_entries(operation_id,currency,amount_minor,entry_type) VALUES (:operationId,'USD',-12345,'sandbox_clearing')", { operationId });
    await connection.execute("INSERT INTO cx_schema_migrations(version) VALUES ('001_initial.sql')");
  });
  console.log('Fixture sintética del esquema anterior preparada; la migración debe conservar USD 123.45 y dos partidas.');
}
main().catch((error) => { console.error(error instanceof Error ? error.message : 'Falló la fixture de actualización.'); process.exitCode = 1; }).finally(closePool);
