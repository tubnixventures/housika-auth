import type { AnalyticsEngineDataset } from '../types/env.ts';

export interface AnalyticsRecord {
  eventType: string;
  path: string;
  method: string;
  statusCode: number;
  durationMs: number;
  country?: string | null;
  actorId?: string | null;
  traceId?: string | null;
  authLevel?: number;
}

export function recordAnalyticsEvent(
  analytics: AnalyticsEngineDataset | undefined,
  record: AnalyticsRecord
): void {
  if (!analytics) return;

  try {
    analytics.writeDataPoint({
      blobs: [
        record.eventType,
        record.path,
        record.method,
        record.country || 'UNKNOWN',
        record.actorId || 'ANONYMOUS',
        record.traceId || 'NONE',
      ],
      doubles: [
        record.statusCode,
        record.durationMs,
        record.authLevel || 0,
      ],
      indexes: [record.eventType],
    });
  } catch (err) {
    console.error('Failed to write to Cloudflare Analytics Engine:', err);
  }
}
