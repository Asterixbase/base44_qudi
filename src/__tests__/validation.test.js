/* eslint-env jest */

import {
  validatePhoneNumber,
  validateEmail,
  validateAmount,
  validateBankAccount,
  validateFullName,
  validatePinCode,
  validateTransactionInput,
} from '../lib/validation';

describe('Validation Utilities', () => {
  describe('validatePhoneNumber', () => {
    test('accepts valid Ghana phone numbers', () => {
      expect(validatePhoneNumber('+233 24 000 0000')).toBe(true);
      expect(validatePhoneNumber('+233245000000')).toBe(true);
      expect(validatePhoneNumber('0245000000')).toBe(true);
      expect(validatePhoneNumber('0552345678')).toBe(true);
    });

    test('rejects invalid phone numbers', () => {
      expect(validatePhoneNumber('123')).toBe(false);
      expect(validatePhoneNumber('invalid')).toBe(false);
      expect(validatePhoneNumber('+1234567890')).toBe(false);
    });
  });

  describe('validateEmail', () => {
    test('accepts valid emails', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user@gmail.co.uk')).toBe(true);
    });

    test('rejects invalid emails', () => {
      expect(validateEmail('notanemail')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
    });
  });

  describe('validateAmount', () => {
    test('accepts valid amounts', () => {
      expect(validateAmount('100')).toBe(true);
      expect(validateAmount(50.5)).toBe(true);
      expect(validateAmount('1000000')).toBe(true);
    });

    test('rejects invalid amounts', () => {
      expect(validateAmount('abc')).toBe(false);
      expect(validateAmount('-100')).toBe(false);
      expect(validateAmount('0')).toBe(false);
    });

    test('respects min/max bounds', () => {
      expect(validateAmount(50, 0, 100)).toBe(true);
      expect(validateAmount(150, 0, 100)).toBe(false);
    });
  });

  describe('validateBankAccount', () => {
    test('accepts valid 4-digit accounts', () => {
      expect(validateBankAccount('1234')).toBe(true);
      expect(validateBankAccount('9999')).toBe(true);
    });

    test('rejects invalid 4-digit formats', () => {
      expect(validateBankAccount('123')).toBe(false);
      expect(validateBankAccount('12345')).toBe(false);
      expect(validateBankAccount('abcd')).toBe(false);
    });
  });

  describe('validateFullName', () => {
    test('accepts valid names', () => {
      expect(validateFullName('John Doe')).toBe(true);
      expect(validateFullName('Mary Smith-Jones')).toBe(true);
    });

    test('rejects invalid names', () => {
      expect(validateFullName('J')).toBe(false);
      expect(validateFullName('')).toBe(false);
      expect(validateFullName('  ')).toBe(false);
    });
  });

  describe('validatePinCode', () => {
    test('accepts valid PIN codes', () => {
      expect(validatePinCode('1234')).toBe(true);
      expect(validatePinCode('123456')).toBe(true);
    });

    test('rejects invalid PIN codes', () => {
      expect(validatePinCode('123')).toBe(false);
      expect(validatePinCode('12345678')).toBe(false);
      expect(validatePinCode('abcd')).toBe(false);
    });
  });

  describe('validateTransactionInput', () => {
    test('validates all fields correctly', () => {
      const result = validateTransactionInput({
        phone: '+233245000000',
        amount: '100',
        pin: '1234',
        idNumber: '12345678',
      });
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    test('collects multiple validation errors', () => {
      const result = validateTransactionInput({
        phone: 'invalid',
        amount: 'abc',
        pin: '123',
      });
      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    });
  });
});