import mysql from 'mysql2/promise';

function createPool() {
  return mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
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
  global._mysqlPool ?? (global._mysqlPool = createPool());

/**
 * Execute a parameterized SQL query and return typed rows.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: any[] = [],
): Promise<T[]> {
  try {
    const [rows] = await pool.query(sql, params);
    return rows as T[];
  } catch (err) {
    console.error('[DB] Query error:', err, { sql: sql.slice(0, 200), params });
    throw err;
  }
}

export default pool;
