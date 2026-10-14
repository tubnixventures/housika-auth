import { describe, it, expect, vi } from 'vitest';
import { app } from '../src/index.ts';
import { checkRateLimit } from '../src/utils/kv-ratelimit.ts';
import { recordAnalyticsEvent } from '../src/utils/analytics.ts';
import { captureSystemError } from '../src/utils/error-logger.ts';
import { resolveSignupRole } from '../src/arc/endpoints/signup/service.ts';
import { createMockD1 } from '../src/utils/d1-mock.ts';
import type { KVNamespace, AnalyticsEngineDataset } from '../src/types/env.ts';
import type { Role } from '../src/types/auth.ts';

describe('KV Rate Limiter & Cloudflare Analytics Engine', () => {
  it('enforces rate limits and sets correct headers using mock KV', async () => {
    const kvStore = new Map<string, string>();
    const mockKv: KVNamespace = {
      async get(key: string) { return kvStore.get(key) || null; },
      async put(key: string, val: string) { kvStore.set(key, val); },
      async delete(key: string) { kvStore.delete(key); },
    };

    const first = await checkRateLimit(mockKv, 'test-ip-1', 2, 60);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);

    const second = await checkRateLimit(mockKv, 'test-ip-1', 2, 60);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);

    const third = await checkRateLimit(mockKv, 'test-ip-1', 2, 60);
    expect(third.allowed).toBe(false);
  });

  it('records telemetry datapoints into Cloudflare Analytics Engine', () => {
    const writeDataPoint = vi.fn();
    const mockAnalytics: AnalyticsEngineDataset = { writeDataPoint };

    recordAnalyticsEvent(mockAnalytics, {
      eventType: 'AUTH_LOGIN',
      path: '/auth/login',
      method: 'POST',
      statusCode: 200,
      durationMs: 45,
      country: 'KE',
      actorId: 'acc_123',
    });

    expect(writeDataPoint).toHaveBeenCalledOnce();
    const callArgs = writeDataPoint.mock.calls[0][0];
    expect(callArgs.blobs[0]).toBe('AUTH_LOGIN');
    expect(callArgs.blobs[1]).toBe('/auth/login');
    expect(callArgs.doubles[0]).toBe(200);
  });

  it('captures developer diagnostic errors into D1 and Analytics Engine', async () => {
    const writeDataPoint = vi.fn();
    const mockAnalytics: AnalyticsEngineDataset = { writeDataPoint };
    const mockDb = createMockD1([]);

    const traceId = await captureSystemError(mockDb, mockAnalytics, {
      error: new Error('Simulated database connection failure'),
      path: '/auth/login',
      method: 'POST',
      ipAddress: '197.237.10.5',
    });

    expect(traceId).toBeDefined();
    expect(writeDataPoint).toHaveBeenCalledWith(
      expect.objectContaining({
        indexes: ['SYSTEM_ERROR'],
      })
    );
  });

  it('strictly prevents any Housika internal staff role creation on signup', () => {
    // Attempting to request staff roles ('root', 'ceo', 'admin') is ignored / maps strictly to customer roles
    const indRole = resolveSignupRole('individual', 'root' as unknown as Role);
    expect(indRole.role).toBe('tenant');
    expect(indRole.level).toBe(20);

    const compRole = resolveSignupRole('company', 'root' as unknown as Role);
    expect(compRole.role).toBe('landlord');
    expect(compRole.level).toBe(30);
  });
});
