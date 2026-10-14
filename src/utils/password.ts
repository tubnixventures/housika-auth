import bcrypt from 'bcryptjs';

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

export function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (!password || password.length < MIN_LENGTH) {
    return { valid: false, reason: `Password must be at least ${MIN_LENGTH} characters long` };
  }
  if (password.length > MAX_LENGTH) {
    return { valid: false, reason: `Password cannot exceed ${MAX_LENGTH} characters` };
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);

  if (!hasUpper || !hasLower || !hasDigit) {
    return {
      valid: false,
      reason: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    };
  }
  return { valid: true };
}

export async function hashPassword(password: string, rounds = 10): Promise<string> {
  // Prevent CPU exhaustion by capping rounds
  const safeRounds = Math.min(Math.max(rounds, 8), 12);
  const salt = await bcrypt.genSalt(safeRounds);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
