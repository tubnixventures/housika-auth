import { AppError } from './errors.ts';
import type { Bindings } from '../types/env.ts';

export function getRequiredSecret(
  env: Bindings | undefined,
  secretName: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET' | 'CHALLENGE_HMAC_SECRET'
): string {
  const secret = env?.[secretName];
  if (!secret || typeof secret !== 'string' || secret.trim().length < 16) {
    console.error(`[CRITICAL] Missing or invalid required secret configuration: ${secretName}`);
    throw new AppError('Cryptographic security service unavailable', 500, 'SERVER_CONFIGURATION_ERROR');
  }
  return secret.trim();
}
