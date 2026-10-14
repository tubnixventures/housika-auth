import { describe, it, expect } from 'vitest';
import { sha256, hmacSha256, timingSafeEqual } from '../src/utils/security.ts';
import { generateOtp } from '../src/utils/ids.ts';
import { sendSuccess, sendError } from '../src/utils/response.ts';
import { Hono } from 'hono';

describe('Security, Data Sanitization & Timing Defense', () => {
  it('generates random 6-digit OTP codes and predictable SHA-256', async () => {
    const otp = generateOtp();
    expect(otp).toHaveLength(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);

    const hash = await sha256('housika');
    expect(hash).toHaveLength(64);
  });

  it('validates HMAC-SHA256 with constant-time equality check', async () => {
    const secret = 'secret_test_key_123456';
    const h1 = await hmacSha256('583921', secret);
    const h2 = await hmacSha256('583921', secret);
    const h3 = await hmacSha256('123456', secret);

    expect(timingSafeEqual(h1, h2)).toBe(true);
    expect(timingSafeEqual(h1, h3)).toBe(false);
  });

  it('automatically sanitizes and redacts sensitive credentials from responses', async () => {
    const testApp = new Hono();
    testApp.get('/test-leak', (c) => {
      return sendSuccess(c, {
        id: 'user_123',
        email: 'user@housika.co.ke',
        password_hash: '$2a$10$supersecret',
        password: 'PlainTextPassword123!',
        token_family_id: 'fam_12345',
        nested: {
          apiKey: 'key_12345',
          safeValue: 'ok',
        },
      });
    });

    const res = await testApp.fetch(new Request('http://localhost/test-leak'));
    const json = (await res.json()) as { data: Record<string, unknown> };

    expect(json.data.id).toBe('user_123');
    expect(json.data.email).toBe('user@housika.co.ke');
    expect(json.data.password_hash).toBeUndefined();
    expect(json.data.password).toBeUndefined();
    expect(json.data.token_family_id).toBeUndefined();
    expect((json.data.nested as Record<string, unknown>).apiKey).toBeUndefined();
    expect((json.data.nested as Record<string, unknown>).safeValue).toBe('ok');
  });

  it('sanitizes details in error responses to prevent exception data leaks', async () => {
    const testApp = new Hono();
    testApp.get('/test-error', (c) => {
      return sendError(c, 'Validation error occurred', 400, 'VALIDATION_ERROR', {
        submittedPassword: 'UserTypedPassword!',
        password: 'raw_secret',
        field: 'email',
      });
    });

    const res = await testApp.fetch(new Request('http://localhost/test-error'));
    const json = (await res.json()) as { error: { details: Record<string, unknown> } };

    expect(json.error.details.password).toBeUndefined();
    expect(json.error.details.field).toBe('email');
  });
});
