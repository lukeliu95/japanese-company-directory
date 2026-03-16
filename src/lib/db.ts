import mysql from 'mysql2/promise';

function createPool() {
  return mysql.createPool({
    host: process.env.MYSQL_HOST ?? 'gtm-prod.celp3nik7oaq.ap-northeast-1.rds.amazonaws.com',
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? 'gtm_app',
    password: process.env.MYSQL_PASSWORD ?? 'Qiang3Mi4Ma3!2o26',
    database: process.env.MYSQL_DATABASE ?? 'gtm_raw_core',
    charset: 'utf8mb4',
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    connectTimeout: 20000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });
}

// Reuse pool across hot reloads in development
declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
}

const pool: mysql.Pool =
  process.env.NODE_ENV === 'production'
    ? createPool()
    : (global._mysqlPool ?? (global._mysqlPool = createPool()));

/**
 * Execute a parameterized SQL query and return typed rows.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: any[] = [],
): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

export default pool;
