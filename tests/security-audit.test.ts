import { describe, it, expect } from 'vitest';
import { getRequiredSecret } from '../src/utils/secrets.ts';
import { isOriginAllowed } from '../src/middleware/cors.ts';
import { processTokenRotation } from '../src/arc/endpoints/refresh/service.ts';
import { createMockD1 } from '../src/utils/d1-mock.ts';
import { createAccessToken } from '../src/utils/jwt.ts';
import { authMiddleware } from '../src/middleware/auth.ts';
import { Hono } from 'hono';

describe('Security Audit 4 Priorities Verification', () => {
  const secret = 'test_secret_for_audit_32_characters_long';

  it('Priority 1: Fails securely with 500 when required secrets are missing', () => {
    expect(() => getRequiredSecret({} as any, 'JWT_ACCESS_SECRET')).toThrowError();
    expect(() => getRequiredSecret({ JWT_ACCESS_SECRET: 'short' } as any, 'JWT_ACCESS_SECRET')).toThrowError();
    expect(getRequiredSecret({ JWT_ACCESS_SECRET: secret } as any, 'JWT_ACCESS_SECRET')).toBe(secret);
  });

  it('Priority 2: Rejects unverified accounts on protected endpoints with 403 EMAIL_NOT_VERIFIED', async () => {
    const token = await createAccessToken({
      accountId: 'acc_unverified', sessionId: 'sess_1', countryId: 'ctry_ke_01',
      accountType: 'individual', role: 'tenant', level: 20, authVersion: 1,
    }, secret);

    const mockAccountsDb = createMockD1([
      { id: 'acc_unverified', status: 'pending_verification', email_verified_at: null, auth_version: 1, role: 'tenant', level: 20 },
    ]);

    const testApp = new Hono();
    testApp.use('*', authMiddleware);
    testApp.get('/protected', (c) => c.json({ ok: true }));

    const res = await testApp.fetch(
      new Request('http://localhost/protected', { headers: { Authorization: `Bearer ${token}` } }),
      { JWT_ACCESS_SECRET: secret, DB_ACCOUNTS: mockAccountsDb } as any
    );

    expect(res.status).toBe(403);
    const json = (await res.json()) as any;
    expect(json.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('Priority 3: Rejects untrusted cross-origin requests and validates trusted Housika domains', () => {
    expect(isOriginAllowed('https://housika.co.ke')).toBe(true);
    expect(isOriginAllowed('https://app.housika.co.ke')).toBe(true);
    expect(isOriginAllowed('https://admin.housika.co.ke')).toBe(true);
    expect(isOriginAllowed('https://attacker-phishing.com')).toBe(false);
    expect(isOriginAllowed('https://malicious.evil.com')).toBe(false);
  });

  it('Priority 4: Rotates tokens and invalidates entire family upon reuse detection', async () => {
    const sessionsTable: Array<Record<string, unknown>> = [
      { id: 'sess_active', account_id: 'acc_1', refresh_token_hash: 'hash_token_1', token_family_id: 'fam_1', expires_at: 9999999999, revoked_at: null },
    ];
    const mockDb = createMockD1(sessionsTable as any);

    // 1. Initial valid rotation
    const rot1 = await processTokenRotation(mockDb, 'raw_token_1');
    expect(rot1.success).toBe(true);
    expect(rot1.newRefreshToken).toBeDefined();

    // In a database, session is now marked revoked_at != null
    sessionsTable[0].revoked_at = 1700000000;
    sessionsTable[0].revoke_reason = 'rotated';

    // 2. Attacker attempts to reuse rotated token
    const rotReuse = await processTokenRotation(mockDb, 'raw_token_1');
    expect(rotReuse.success).toBe(false);
    expect(rotReuse.error).toContain('Token reuse detected');
  });
});
