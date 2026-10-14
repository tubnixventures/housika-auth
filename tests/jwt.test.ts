import { describe, it, expect } from 'vitest';
import { createAccessToken, verifyAccessToken } from '../src/utils/jwt.ts';

describe('JWT Access Token Generation and Verification', () => {
  const secret = 'housika_test_super_secret_key_32_characters';

  it('signs and verifies access token with claims', async () => {
    const token = await createAccessToken(
      {
        accountId: 'acc_1234567890',
        sessionId: 'sess_1234567890',
        countryId: 'ctry_ke_01',
        accountType: 'individual',
        role: 'tenant',
        level: 20,
        authVersion: 1,
      },
      secret
    );

    expect(token).toBeDefined();
    const payload = await verifyAccessToken(token, secret);
    expect(payload.sub).toBe('acc_1234567890');
    expect(payload.sid).toBe('sess_1234567890');
    expect(payload.role).toBe('tenant');
    expect(payload.level).toBe(20);
    expect(payload.iss).toBe('https://auth.housika.com');
  });
});
