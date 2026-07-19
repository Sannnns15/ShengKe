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

  it('should accept valid password (≥6 chars)', () => {
    expect(validatePassword('pass123')).toBeNull();
    expect(validatePassword('abcdef')).toBeNull();
    expect(validatePassword('password123')).toBeNull();
  });

  it('should reject short password (<6 chars)', () => {
    expect(validatePassword('123')).not.toBeNull();
    expect(validatePassword('abcde')).not.toBeNull();
  });
});
