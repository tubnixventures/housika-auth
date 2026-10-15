import { describe, it, expect } from 'vitest';
import { app } from '../src/index.ts';
import { createMockD1 } from '../src/utils/d1-mock.ts';

describe('Brute-Force & Security Penetration Simulation', () => {
  const jwtSecret = 'test_jwt_access_secret_min16_chars';

  it('blocks credential brute-force attacks with HTTP 429 after 5 attempts', async () => {
    const ip = '198.51.100.101';
    const env = {
      DB_ACCOUNTS: createMockD1([]), DB_SESSIONS: createMockD1([]), DB_AUDIT: createMockD1([]),
      JWT_ACCESS_SECRET: jwtSecret,
    } as any;

    for (let i = 1; i <= 5; i++) {
      const res = await app.fetch(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': ip },
          body: JSON.stringify({ identifier: 'victim@housika.co.ke', password: `Guess${i}!` }),
        }),
        env
      );
      expect(res.status).toBe(401);
      expect(res.headers.get('X-RateLimit-Remaining')).toBe((5 - i).toString());
    }

    // 6th attempt must be cut off by the rate limiter
    const blockedRes = await app.fetch(
      new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': ip },
        body: JSON.stringify({ identifier: 'victim@housika.co.ke', password: 'Guess6!' }),
      }),
      env
    );

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.headers.get('Retry-After')).toBeDefined();
    const body = (await blockedRes.json()) as any;
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('neutralizes SQL injection payloads in login identifier safely', async () => {
    const env = {
      DB_ACCOUNTS: createMockD1([]), DB_SESSIONS: createMockD1([]), DB_AUDIT: createMockD1([]),
      JWT_ACCESS_SECRET: jwtSecret,
    } as any;

    const sqlPayloads = [
      "' OR '1'='1",
      "admin' --",
      "\" OR \"\"=\"",
      "'; DROP TABLE accounts; --",
    ];

    for (const sql of sqlPayloads) {
      const res = await app.fetch(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '198.51.100.102' },
          body: JSON.stringify({ identifier: sql, password: 'Password123!' }),
        }),
        env
      );
      expect(res.status).toBe(401);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe('INVALID_CREDENTIALS');
    }
  });

  it('rejects malformed and non-JSON request bodies gracefully with 400', async () => {
    const res = await app.fetch(
      new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '198.51.100.103' },
        body: 'NOT_VALID_JSON{:::broken',
      })
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.error.code).toBe('INVALID_CREDENTIALS');
  });
});
