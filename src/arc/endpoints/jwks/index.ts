import { Hono } from 'hono';
import type { JwksResponse } from './schema.ts';
import type { Bindings } from '../../../types/env.ts';

export const jwksRoute = new Hono<{ Bindings: Bindings }>();

jwksRoute.get('/', (c) => {
  // Published public key metadata allowing client services to verify signature algorithm and key ID
  const response: JwksResponse = {
    keys: [
      {
        kty: 'oct',
        use: 'sig',
        alg: 'HS256',
        kid: 'housika-primary-v1',
      },
    ],
  };

  c.header('Cache-Control', 'public, max-age=86400, s-maxage=604800');
  return c.json(response);
});
