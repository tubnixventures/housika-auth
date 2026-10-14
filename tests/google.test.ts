import { describe, it, expect, vi } from 'vitest';
import { app } from '../src/index.ts';
import * as googleService from '../src/arc/endpoints/google/service.ts';
import { createMockD1 } from '../src/utils/d1-mock.ts';

describe('Google Authentication Endpoint', () => {
  it('rejects invalid or missing Google ID tokens', async () => {
    const res = await app.fetch(
      new Request('http://localhost/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'short' }),
      })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects unverified Google tokens from remote tokeninfo', async () => {
    vi.spyOn(googleService, 'verifyGoogleToken').mockResolvedValueOnce({
      success: false,
      error: 'Google token verification failed',
    });

    const mockDb = createMockD1([]);
    const res = await app.fetch(
      new Request('http://localhost/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'valid_looking_token_1234567890_abcdef' }),
      }),
      {
        DB_ACCOUNTS: mockDb,
        DB_PROFILES: mockDb,
        DB_SESSIONS: mockDb,
        DB_COUNTRIES: mockDb,
        DB_AUDIT: mockDb,
      } as unknown as Record<string, unknown>
    );

    expect(res.status).toBe(401);
  });
});
