import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../src/utils/password.ts';

describe('Password Security Utilities', () => {
  it('validates password strength rules', () => {
    expect(validatePasswordStrength('short1A').valid).toBe(false);
    expect(validatePasswordStrength('alllowercase1').valid).toBe(false);
    expect(validatePasswordStrength('ALLUPPERCASE1').valid).toBe(false);
    expect(validatePasswordStrength('NoNumbersHere!').valid).toBe(false);
    expect(validatePasswordStrength('SecurePass123!').valid).toBe(true);
  });

  it('correctly hashes and verifies passwords using bcryptjs', async () => {
    const raw = 'SuperSecret123!';
    const hash = await hashPassword(raw, 10);
    expect(hash).toBeDefined();
    expect(hash.startsWith('$2')).toBe(true);

    const isMatch = await verifyPassword(raw, hash);
    expect(isMatch).toBe(true);

    const wrongMatch = await verifyPassword('WrongPassword999!', hash);
    expect(wrongMatch).toBe(false);
  });
});
