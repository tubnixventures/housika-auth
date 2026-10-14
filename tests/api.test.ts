import { describe, it, expect } from 'vitest';
import { app } from '../src/index.ts';

describe('API Endpoints and Hyperscale Security', () => {
  it('returns plain text root response and security headers', async () => {
    const res = await app.fetch(new Request('http://localhost/'));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Housika Authentication API');
    expect(res.headers.get('X-Housika-Trace-Id')).toBeDefined();
    expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('serves OpenID Connect discovery and RFC 7517 JWKS', async () => {
    const oidc = await app.fetch(new Request('http://localhost/.well-known/openid-configuration'));
    expect(oidc.status).toBe(200);
    const oidcData = (await oidc.json()) as { jwks_uri: string };
    expect(oidcData.jwks_uri).toContain('/.well-known/jwks.json');

    const jwks = await app.fetch(new Request('http://localhost/.well-known/jwks.json'));
    expect(jwks.status).toBe(200);
    const jwksData = (await jwks.json()) as { keys: unknown[] };
    expect(jwksData.keys.length).toBeGreaterThan(0);
  });

  it('rejects SMS verification requests with inactive service notice', async () => {
    const res = await app.fetch(
      new Request('http://localhost/auth/verify-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'sms', purpose: 'phone_verification' }),
      })
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe('PHONE_VERIFICATION_INACTIVE');
  });

  it('returns documentation in plain text and JSON', async () => {
    const resText = await app.fetch(new Request('http://localhost/doc'));
    expect(resText.status).toBe(200);
    const text = await resText.text();
    expect(text).toContain('Housika Authentication API Reference');

    const resJson = await app.fetch(
      new Request('http://localhost/doc', { headers: { Accept: 'application/json' } })
    );
    expect(resJson.status).toBe(200);
    const json = (await resJson.json()) as { endpoints: unknown[] };
    expect(json.endpoints.length).toBeGreaterThan(12);
  });
});
