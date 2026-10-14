import { z } from 'zod';

export const EnvSchema = z.object({
  ENVIRONMENT: z.string().default('development'),
  APP_URL: z.string().url().default('https://auth.housika.co.ke'),
  BCRYPT_ROUNDS: z.coerce.number().min(8).max(14).default(10),
  JWT_ACCESS_SECRET: z.string().min(16).default('housika_default_access_secret_min16'),
  JWT_REFRESH_SECRET: z.string().min(16).default('housika_default_refresh_secret_min16'),
  CHALLENGE_HMAC_SECRET: z.string().min(16).default('housika_default_hmac_secret_min16'),
  ZEPTOMAIL_API_KEY: z.string().optional(),
  ZEPTOMAIL_FROM_ADDRESS: z.string().email().default('accounts@housika.co.ke'),
  ZEPTOMAIL_FROM_NAME: z.string().default('Housika Accounts'),
  INFOBIP_API_KEY: z.string().optional(),
  INFOBIP_BASE_URL: z.string().optional(),
  INFOBIP_WHATSAPP_NUMBER: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
});

export type EnvVars = z.infer<typeof EnvSchema>;

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean }>;
  run(): Promise<{ success: boolean; meta?: unknown }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
  exec(query: string): Promise<unknown>;
}

export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface AnalyticsDataPoint {
  blobs?: (string | null | undefined)[];
  doubles?: (number | null | undefined)[];
  indexes?: (string | null | undefined)[];
}

export interface AnalyticsEngineDataset {
  writeDataPoint(point: AnalyticsDataPoint): void;
}

export interface Bindings extends EnvVars {
  DB_ACCOUNTS?: D1Database;
  DB_PROFILES?: D1Database;
  DB_SESSIONS?: D1Database;
  DB_COUNTRIES?: D1Database;
  DB_CHALLENGES?: D1Database;
  DB_AUDIT?: D1Database;
  KV_RATE_LIMIT?: KVNamespace;
  ANALYTICS?: AnalyticsEngineDataset;
}
