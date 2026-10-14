import type { KVNamespace } from '../types/env.ts';

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  remaining: number;
  resetAt: number;
}

// In-memory fallback for local dev & unit tests when KV is unbound
const memoryStore = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  kv: KVNamespace | undefined,
  identifier: string,
  limit: number,
  windowSeconds = 60
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / windowSeconds);
  const resetAt = (bucket + 1) * windowSeconds;
  const key = `rl:${identifier}:${bucket}`;

  if (!kv) {
    const record = memoryStore.get(key);
    if (!record || now >= record.resetAt) {
      memoryStore.set(key, { count: 1, resetAt });
      return { allowed: true, count: 1, remaining: limit - 1, resetAt };
    }
    record.count++;
    const remaining = Math.max(0, limit - record.count);
    return { allowed: record.count <= limit, count: record.count, remaining, resetAt };
  }

  try {
    const currentVal = await kv.get(key);
    const count = currentVal ? parseInt(currentVal, 10) + 1 : 1;
    await kv.put(key, count.toString(), { expirationTtl: windowSeconds * 2 });

    const remaining = Math.max(0, limit - count);
    return { allowed: count <= limit, count, remaining, resetAt };
  } catch (err) {
    console.error('KV Rate Limit error, failing open safely:', err);
    return { allowed: true, count: 1, remaining: limit - 1, resetAt };
  }
}
