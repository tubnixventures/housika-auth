import { generateAuditId, createId } from './ids.ts';
import { nowUtc } from './time.ts';
import { execute } from './d1.ts';
import type { D1Database, AnalyticsEngineDataset } from '../types/env.ts';

export interface SystemErrorParams {
  error: unknown;
  path: string;
  method: string;
  traceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  durationMs?: number;
}

export async function captureSystemError(
  db: D1Database | undefined,
  analytics: AnalyticsEngineDataset | undefined,
  params: SystemErrorParams
): Promise<string> {
  const err = params.error instanceof Error ? params.error : new Error(String(params.error));
  const traceId = params.traceId || createId('trc', 16);
  const now = nowUtc();

  // 1. Stream to Cloudflare Analytics Engine for real-time monitoring & alerting
  if (analytics) {
    try {
      analytics.writeDataPoint({
        blobs: ['SYSTEM_ERROR', params.path, params.method, err.name, traceId, params.ipAddress || 'UNKNOWN'],
        doubles: [500, params.durationMs || 0, Date.now()],
        indexes: ['SYSTEM_ERROR'],
      });
    } catch (e) {
      console.error('Analytics Engine error logging failed:', e);
    }
  }

  // 2. Persist diagnostic stack trace to D1 Audit for forensic inspection
  if (db) {
    try {
      const auditId = generateAuditId();
      const meta = JSON.stringify({
        errorName: err.name,
        errorMessage: err.message,
        stack: err.stack ? err.stack.split('\n').slice(0, 8).join('\n') : undefined,
        path: params.path,
        method: params.method,
        traceId,
      });

      const sql = `INSERT INTO audit_events 
        (id, actor_id, target_id, event_type, ip_address, user_agent, metadata, created_at, updated_at)
        VALUES (?, 'SYSTEM', ?, 'SYSTEM_ERROR', ?, ?, ?, ?, ?)`;

      await execute(db, sql, [auditId, traceId, params.ipAddress || null, params.userAgent || null, meta, now, now]);
    } catch (dbErr) {
      console.error('D1 Error recording failed:', dbErr);
    }
  }

  return traceId;
}
