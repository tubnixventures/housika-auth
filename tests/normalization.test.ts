import { describe, it, expect } from 'vitest';
import { normalizeEmail, normalizePhone, isEmail } from '../src/utils/normalization.ts';

describe('Identifier Normalization', () => {
  it('normalizes email addresses correctly', () => {
    expect(normalizeEmail('John.Doe@Gmail.com')).toBe('johndoe@gmail.com');
    expect(normalizeEmail('  user.test@example.com ')).toBe('user.test@example.com');
    expect(isEmail('user@domain.com')).toBe(true);
    expect(isEmail('+254712345678')).toBe(false);
  });

  it('normalizes international phone numbers into E.164 format', () => {
    expect(normalizePhone('0712345678', '+254')).toBe('+254712345678');
    expect(normalizePhone('+254 712-345-678')).toBe('+254712345678');
    expect(normalizePhone('00254712345678')).toBe('+254712345678');
  });
});
