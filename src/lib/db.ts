import { createClient, InValue } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default db;

// Helper for running queries
export async function query<T = unknown>(
  sql: string,
  args: InValue[] = []
): Promise<T[]> {
  const result = await db.execute({ sql, args });
  return result.rows as T[];
}

// Helper for single row
export async function queryOne<T = unknown>(
  sql: string,
  args: InValue[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, args);
  return rows[0] ?? null;
}

// Helper for execute (INSERT, UPDATE, DELETE)
export async function execute(sql: string, args: InValue[] = []) {
  return db.execute({ sql, args });
}
