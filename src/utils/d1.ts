import type { D1Database, D1PreparedStatement } from '../types/env.ts';

export async function queryOne<T = Record<string, unknown>>(
  db: D1Database | undefined,
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  if (!db) {
    throw new Error('Database binding not provided');
  }
  const stmt: D1PreparedStatement = db.prepare(sql).bind(...params);
  return stmt.first<T>();
}

export async function queryAll<T = Record<string, unknown>>(
  db: D1Database | undefined,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  if (!db) {
    throw new Error('Database binding not provided');
  }
  const stmt: D1PreparedStatement = db.prepare(sql).bind(...params);
  const result = await stmt.all<T>();
  return result.results || [];
}

export async function execute(
  db: D1Database | undefined,
  sql: string,
  params: unknown[] = []
): Promise<boolean> {
  if (!db) {
    throw new Error('Database binding not provided');
  }
  const stmt: D1PreparedStatement = db.prepare(sql).bind(...params);
  const result = await stmt.run();
  return result.success;
}
