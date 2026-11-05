import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { closePool, withConnection } from "./oracle";
import { splitMigration } from "./sql-script";

async function main() {
  await withConnection(async (connection) => {
    await connection.execute(`
      BEGIN
        EXECUTE IMMEDIATE 'CREATE TABLE cx_schema_migrations (version VARCHAR2(120 CHAR) PRIMARY KEY, applied_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL)';
      EXCEPTION WHEN OTHERS THEN
        IF SQLCODE != -955 THEN RAISE; END IF;
      END;
    `);
  });

  const directory = join(process.cwd(), "database", "migrations");
  const files = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
  for (const file of files) {
    const applied = await withConnection((connection) =>
      connection.execute<{ VERSION: string }>(
        "SELECT version FROM cx_schema_migrations WHERE version = :version",
        { version: file }
      )
    );
    if (applied.rows?.length) {
      console.log(`Ya aplicada: ${file}`);
      continue;
    }

    const sql = await readFile(join(directory, file), "utf8");
    const statements = splitMigration(sql);
    try {
      await withConnection(async (connection) => {
        for (const statement of statements) {
          try {
            await connection.execute(statement);
          } catch (error) {
            if ((error as { errorNum?: number }).errorNum !== 955) throw error;
          }
        }
        await connection.execute("INSERT INTO cx_schema_migrations(version) VALUES (:version)", {
          version: file,
        });
        await connection.commit();
      });
      console.log(`Aplicada: ${file}`);
    } catch (error) {
      console.error(`Falló ${file}; Oracle puede haber confirmado DDL previo automáticamente.`, error);
      throw error;
    }
  }
}

main().catch((error) => {
  console.error("No se pudieron ejecutar las migraciones Oracle.", error);
  process.exitCode = 1;
}).finally(closePool);
