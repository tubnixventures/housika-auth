import { generateAuditId } from './ids.ts';
import { nowUtc } from './time.ts';
import { execute } from './d1.ts';
import type { D1Database, AnalyticsEngineDataset } from '../types/env.ts';

export interface AuditEventParams {
  actorId?: string | null;
  targetId?: string | null;
  eventType: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent(
  db: D1Database | undefined,
  params: AuditEventParams,
  analytics?: AnalyticsEngineDataset
): Promise<void> {
  const now = nowUtc();
  const sanitizedMeta = params.metadata ? sanitizeMetadata(params.metadata) : null;

  // 1. Dual-write to Cloudflare Analytics Engine for real-time edge streaming
  if (analytics) {
    try {
      analytics.writeDataPoint({
        blobs: [params.eventType, params.actorId || 'NONE', params.targetId || 'NONE', params.ipAddress || 'UNKNOWN'],
        doubles: [Date.now()],
        indexes: [params.eventType],
      });
    } catch (e) {
      console.error('Analytics Engine audit emit error:', e);
    }
  }

  // 2. Write to D1 Audit Database for compliance and immutable history
  if (!db) return;
  try {
    const id = generateAuditId();
    const metaStr = sanitizedMeta ? JSON.stringify(sanitizedMeta) : null;

    const sql = `INSERT INTO audit_events 
      (id, actor_id, target_id, event_type, ip_address, user_agent, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    await execute(db, sql, [
      id,
      params.actorId || null,
      params.targetId || null,
      params.eventType,
      params.ipAddress || null,
      params.userAgent || null,
      metaStr,
      now,
      now,
    ]);
  } catch (err) {
    console.error('Failed to record audit event in D1:', err);
  }
}

function sanitizeMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['password', 'token', 'secret', 'otp', 'refresh_token', 'hash', 'apiKey'];
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
