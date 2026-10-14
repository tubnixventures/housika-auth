import type { Context } from 'hono';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: number;
    traceId?: string;
  };
}

const REDACTED_KEYS = new Set([
  'password', 'password_hash', 'passwordhash', 'secret', 'secret_hash',
  'refresh_token_hash', 'token_hash', 'tokenfamilyid', 'token_family_id',
  'apikey', 'api_key', 'privatekey', 'private_key', 'authorization'
]);

function sanitizeData<T>(obj: T, depth = 0): T {
  if (depth > 6 || obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeData(item, depth + 1)) as unknown as T;
  }
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      continue; // Completely strip sensitive credentials from leaving the backend
    }
    clean[key] = sanitizeData(value, depth + 1);
  }
  return clean as T;
}

export function sendSuccess<T>(c: Context, data: T, status: 200 | 201 = 200) {
  const traceId = (c.get('traceId') as string) || c.res.headers.get('X-Housika-Trace-Id') || undefined;
  const body: ApiResponse<T> = {
    success: true,
    data: sanitizeData(data),
    meta: {
      timestamp: Math.floor(Date.now() / 1000),
      ...(traceId ? { traceId } : {}),
    },
  };
  return c.json(body, status);
}

export function sendError(
  c: Context,
  message: string,
  statusCode = 400,
  code = 'ERROR',
  details?: unknown
) {
  const traceId = (c.get('traceId') as string) || c.res.headers.get('X-Housika-Trace-Id') || undefined;
  const body: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details: sanitizeData(details) } : {}),
    },
    meta: {
      timestamp: Math.floor(Date.now() / 1000),
      ...(traceId ? { traceId } : {}),
    },
  };
  return c.json(body, statusCode as 400 | 401 | 403 | 404 | 409 | 422 | 500);
}
