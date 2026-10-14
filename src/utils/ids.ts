import { nanoid } from 'nanoid';

export function createId(prefix: string, size = 16): string {
  return `${prefix}_${nanoid(size)}`;
}

export function generateAccountId(): string {
  return createId('acc', 18);
}

export function generateProfileId(): string {
  return createId('prof', 18);
}

export function generateSessionId(): string {
  return createId('sess', 20);
}

export function generateChallengeId(): string {
  return createId('chlg', 18);
}

export function generateAuditId(): string {
  return createId('aud', 20);
}

export function generateTokenFamilyId(): string {
  return createId('fam', 16);
}

export function generateOtp(): string {
  // Cryptographically secure 6-digit numeric OTP
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  const code = (buffer[0] % 900000) + 100000;
  return code.toString();
}
