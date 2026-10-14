import type { Context, Next } from 'hono';
import { verifyAccessToken } from '../utils/jwt.ts';
import { sendError } from '../utils/response.ts';
import type { AccessTokenPayload, Role } from '../types/auth.ts';
import type { Bindings } from '../types/env.ts';

declare module 'hono' {
  interface ContextVariableMap {
    user: AccessTokenPayload;
    traceId?: string;
  }
}

export async function authMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else {
    // Check cookie fallback
    const cookie = c.req.header('Cookie');
    if (cookie) {
      const match = cookie.match(/housika_access_token=([^;]+)/);
      if (match) token = match[1];
    }
  }

  if (!token) {
    return sendError(c, 'Authentication token missing or invalid', 401, 'UNAUTHORIZED');
  }

  const secret = c.env?.JWT_ACCESS_SECRET || 'housika_default_access_secret_min16';
  try {
    const payload = await verifyAccessToken(token, secret);
    c.set('user', payload);
    await next();
  } catch {
    return sendError(c, 'Invalid or expired access token', 401, 'TOKEN_INVALID');
  }
}

export function requireMinLevel(minLevel: number) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!user || user.level < minLevel) {
      return sendError(c, 'Insufficient permission level', 403, 'FORBIDDEN');
    }
    await next();
  };
}

export function requireRoles(...allowedRoles: Role[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!user || !allowedRoles.includes(user.role)) {
      return sendError(c, 'Access restricted for current role', 403, 'ROLE_FORBIDDEN');
    }
    await next();
  };
}
