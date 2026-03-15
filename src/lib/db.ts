import { createClient, type Client } from '@libsql/client';

function getDb(): Client {
  const url = process.env.TURSO_DATABASE_URL || 'file:./local.db';
  return createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

// Lazy singleton — only created when first query runs (not at build time)
let _db: Client | null = null;

const db = new Proxy({} as Client, {
  get(_target, prop) {
    if (!_db) _db = getDb();
    return (_db as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export default db;
