import type { Context, Next } from 'hono';
import { verifyAccessToken } from '../utils/jwt.ts';
import { getRequiredSecret } from '../utils/secrets.ts';
import { sendError } from '../utils/response.ts';
import { queryOne } from '../utils/d1.ts';
import type { AccessTokenPayload, Role } from '../types/auth.ts';
import type { Bindings } from '../types/env.ts';

declare module 'hono' {
  interface ContextVariableMap {
    user: AccessTokenPayload;
    traceId?: string;
  }
}

interface AccountAuthRecord {
  id: string; status: string; email_verified_at: number | null;
  auth_version: number; role: Role; level: number;
}

export async function authMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : undefined;
  if (!token) {
    const match = c.req.header('Cookie')?.match(/housika_access_token=([^;]+)/);
    if (match) token = match[1];
  }
  if (!token) return sendError(c, 'Authentication token missing or invalid', 401, 'UNAUTHORIZED');

  const secret = getRequiredSecret(c.env, 'JWT_ACCESS_SECRET');
  let payload: AccessTokenPayload;
  try {
    payload = await verifyAccessToken(token, secret);
  } catch {
    return sendError(c, 'Invalid or expired access token', 401, 'TOKEN_INVALID');
  }

  // Priority 2 & 4: Server-side email verification, status, and revocation enforcement
  if (c.env?.DB_ACCOUNTS) {
    const account = await queryOne<AccountAuthRecord>(
      c.env.DB_ACCOUNTS,
      'SELECT id, status, email_verified_at, auth_version, role, level FROM accounts WHERE id = ?',
      [payload.sub]
    );

    if (!account) return sendError(c, 'Account not found', 401, 'ACCOUNT_NOT_FOUND');
    if (account.status === 'suspended' || account.status === 'deactivated') {
      return sendError(c, 'This account is suspended or disabled', 403, 'ACCOUNT_DISABLED');
    }
    if (account.status === 'pending_verification' || !account.email_verified_at) {
      return sendError(c, 'Email verification required to access this resource. Please verify your email.', 403, 'EMAIL_NOT_VERIFIED');
    }
    if (account.auth_version > payload.authVersion) {
      return sendError(c, 'Session has expired or was revoked', 401, 'TOKEN_REVOKED');
    }
    payload.role = account.role;
    payload.level = account.level;
  }

  // Session revocation validation
  if (c.env?.DB_SESSIONS && payload.sid) {
    const sess = await queryOne<{ revoked_at: number | null }>(
      c.env.DB_SESSIONS, 'SELECT revoked_at FROM sessions WHERE id = ?', [payload.sid]
    );
    if (!sess || sess.revoked_at !== null) return sendError(c, 'Active session has been revoked', 401, 'SESSION_REVOKED');
  }

  c.set('user', payload);
  await next();
}

export function requireMinLevel(minLevel: number) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!user || user.level < minLevel) return sendError(c, 'Insufficient permission level', 403, 'FORBIDDEN');
    await next();
  };
}

export function requireRoles(...allowedRoles: Role[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!user || !allowedRoles.includes(user.role)) return sendError(c, 'Access restricted for current role', 403, 'ROLE_FORBIDDEN');
    await next();
  };
}
