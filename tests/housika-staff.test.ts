import { describe, it, expect } from 'vitest';
import { app } from '../src/index.ts';
import { createMockD1 } from '../src/utils/d1-mock.ts';
import { hashPassword } from '../src/utils/password.ts';
import { verifyAccessToken } from '../src/utils/jwt.ts';

describe('Housika Staff Account Type & Internal Provisioning', () => {
  const jwtSecret = 'test_jwt_access_secret_min16_chars';
  const serviceKey = 'housika_internal_test_secret_32_chars';

  it('rejects public signup attempting to create accountType=housika', async () => {
    const res = await app.fetch(
      new Request('http://localhost/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Staff Impostor', email: 'staff@housika.co.ke', phoneNumber: '0712345678',
          countryId: 'ctry_ke_01', password: 'Password123!', accountType: 'housika',
        }),
      })
    );
    expect(res.status).toBe(422);
  });

  it('rejects internal staff provisioning with role=root or invalid service key', async () => {
    const resAuth = await app.fetch(
      new Request('http://localhost/auth/internal/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Service-Key': 'wrong_key' },
        body: JSON.stringify({ name: 'Admin', email: 'admin@housika.co.ke', password: 'Password123!', role: 'admin' }),
      }),
      { INTERNAL_SERVICE_KEY: serviceKey } as any
    );
    expect(resAuth.status).toBe(401);

    const resRoot = await app.fetch(
      new Request('http://localhost/auth/internal/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Service-Key': serviceKey },
        body: JSON.stringify({ name: 'Root', email: 'root@housika.co.ke', password: 'Password123!', role: 'root' }),
      }),
      { INTERNAL_SERVICE_KEY: serviceKey } as any
    );
    expect(resRoot.status).toBe(422);
  });

  it('allows housika staff account to log in and access current-user with accountType=housika', async () => {
    const staffPw = 'HousikaAdmin2026!';
    const pwHash = await hashPassword(staffPw, 8);
    const mockAccounts = createMockD1([{
      id: 'acc_staff_01', email: 'manager@housika.co.ke', email_normalized: 'manager@housika.co.ke',
      phone_number: '0711000111', password_hash: pwHash, country_id: 'ctry_ke_01',
      account_type: 'housika', role: 'manager', level: 80, status: 'active',
      email_verified_at: 1700000000, auth_version: 1,
    }]);
    const mockProfiles = createMockD1([{
      id: 'prof_staff_01', account_id: 'acc_staff_01', name: 'Platform Manager', display_name: 'Manager',
      country_id: 'ctry_ke_01', country_name: 'Kenya', currency: 'KES',
    }]);
    const env = {
      DB_ACCOUNTS: mockAccounts, DB_PROFILES: mockProfiles,
      DB_SESSIONS: createMockD1([{ revoked_at: null }]),
      JWT_ACCESS_SECRET: jwtSecret,
    } as any;

    const loginRes = await app.fetch(
      new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'manager@housika.co.ke', password: staffPw }),
      }),
      env
    );

    expect(loginRes.status).toBe(200);
    const loginData = (await loginRes.json()) as any;
    expect(loginData.data.account.accountType).toBe('housika');
    expect(loginData.data.account.role).toBe('manager');
    expect(loginData.data.account.level).toBe(80);

    const tokenPayload = await verifyAccessToken(loginData.data.tokens.accessToken, jwtSecret);
    expect(tokenPayload.accountType).toBe('housika');

    const userRes = await app.fetch(
      new Request('http://localhost/auth/current-user', {
        headers: { Authorization: `Bearer ${loginData.data.tokens.accessToken}` },
      }),
      env
    );

    expect(userRes.status).toBe(200);
    const userData = (await userRes.json()) as any;
    expect(userData.data.accountType).toBe('housika');
    expect(userData.data.role).toBe('manager');
  });
});
