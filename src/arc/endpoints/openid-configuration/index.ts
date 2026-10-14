import { Hono } from 'hono';
import type { OpenIdConfiguration } from './schema.ts';
import type { Bindings } from '../../../types/env.ts';

export const openidConfigRoute = new Hono<{ Bindings: Bindings }>();

openidConfigRoute.get('/', (c) => {
  const appUrl = c.env?.APP_URL || 'https://auth.housika.co.ke';
  const cleanUrl = appUrl.replace(/\/+$/, '');

  const config: OpenIdConfiguration = {
    issuer: cleanUrl,
    authorization_endpoint: `${cleanUrl}/auth/login`,
    token_endpoint: `${cleanUrl}/auth/refresh`,
    userinfo_endpoint: `${cleanUrl}/auth/current-user`,
    jwks_uri: `${cleanUrl}/.well-known/jwks.json`,
    response_types_supported: ['token', 'id_token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['HS256'],
    scopes_supported: ['openid', 'profile', 'email', 'phone'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
    claims_supported: [
      'sub',
      'iss',
      'aud',
      'exp',
      'iat',
      'sid',
      'role',
      'level',
      'countryId',
      'accountType',
    ],
  };

  c.header('Cache-Control', 'public, max-age=86400, s-maxage=604800');
  return c.json(config);
});
