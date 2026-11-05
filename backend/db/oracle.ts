import oracledb, { type Connection, type Pool } from "oracledb";

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [oracledb.NUMBER];

let pool: Promise<Pool> | undefined;

export function getPool(): Promise<Pool> {
  if (pool) return pool;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const connectString = process.env.DB_CONNECT_STRING;
  if (!user || !password || !connectString) {
    throw new Error("Configura DB_USER, DB_PASSWORD y DB_CONNECT_STRING para conectar Oracle.");
  }
  pool = oracledb.createPool({
    user,
    password,
    connectString,
    poolMin: Number(process.env.DB_POOL_MIN ?? 1),
    poolMax: Number(process.env.DB_POOL_MAX ?? 10),
    poolIncrement: 1,
    poolTimeout: 60,
    queueTimeout: 10000,
  });
  return pool;
}

export async function withConnection<T>(work: (connection: Connection) => Promise<T>): Promise<T> {
  const activePool = await getPool();
  const connection = await activePool.getConnection();
  try {
    return await work(connection);
  } finally {
    await connection.close();
  }
}

export async function withTransaction<T>(work: (connection: Connection) => Promise<T>): Promise<T> {
  return withConnection(async (connection) => {
    try {
      const value = await work(connection);
      await connection.commit();
      return value;
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  });
}

export async function closePool(): Promise<void> {
  if (!pool) return;
  const activePool = await pool;
  await activePool.close(10);
  pool = undefined;
}
