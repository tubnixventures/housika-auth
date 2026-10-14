import type { D1Database, D1PreparedStatement } from '../types/env.ts';

export function createMockD1(initialRows: Record<string, unknown>[] = []): D1Database {
  const store = [...initialRows];
  return {
    prepare(sql: string): D1PreparedStatement {
      let boundParams: unknown[] = [];
      return {
        bind(...values: unknown[]) {
          boundParams = values;
          return this;
        },
        async first<T = Record<string, unknown>>() {
          const rows = store;
          return (rows[0] as unknown as T) || null;
        },
        async all<T = Record<string, unknown>>() {
          return { results: store as unknown as T[], success: true };
        },
        async run() {
          return { success: true };
        },
      };
    },
    async batch(stmts) {
      return stmts.map(() => ({ success: true }));
    },
    async exec() {
      return { count: 0, duration: 0 };
    },
  };
}
