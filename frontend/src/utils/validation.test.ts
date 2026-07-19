import { describe, it, expect } from 'vitest';
import { validatePhone, validatePassword } from './validation';

describe('validatePhone', () => {
  it('should reject empty string', () => {
    expect(validatePhone('')).not.toBeNull();
    expect(validatePhone('   ')).not.toBeNull();
  });

  it('should accept valid chinese phone number', () => {
    expect(validatePhone('13800138000')).toBeNull();
    expect(validatePhone('15912345678')).toBeNull();
  });

  it('should reject short number', () => {
    expect(validatePhone('12345')).not.toBeNull();
  });

  it('should reject invalid prefix', () => {
    expect(validatePhone('10012345678')).not.toBeNull();
  });
});

describe('validatePassword', () => {
  it('should reject empty password', () => {
    expect(validatePassword('')).not.toBeNull();
  });

  it('should accept valid password (≥8 chars)', () => {
    expect(validatePassword('pass1234')).toBeNull();
    expect(validatePassword('abcdefgh')).toBeNull();
    expect(validatePassword('password123')).toBeNull();
  });

  it('should reject short password (<8 chars)', () => {
    expect(validatePassword('1234567')).not.toBeNull();
    expect(validatePassword('abcdefg')).not.toBeNull();
  });
});
