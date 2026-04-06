// Input validation utilities for financial operations

export function validatePhoneNumber(phone) {
  // Ghana +233 format or 024/025/026/027/028/029 format
  const ghanaPattern = /^(\+233|0)[24-9]\d{8}$/;
  return ghanaPattern.test(phone.replace(/\s/g, ''));
}

export function validateEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

export function validateAmount(amount, min = 0.01, max = 1000000) {
  const num = parseFloat(amount);
  return !isNaN(num) && num >= min && num <= max;
}

export function validateBankAccount(account) {
  // Validate UK bank account (last 4 digits or full IBAN)
  if (account.length === 4) {
    return /^\d{4}$/.test(account);
  }
  // Basic IBAN validation (GB format)
  return /^GB\d{2}[A-Z]{4}\d{14}$/.test(account);
}

export function validateIDNumber(idNumber, idType = 'national') {
  if (!idNumber) return false;
  // Basic length check - customize per country
  return idNumber.length >= 6 && idNumber.length <= 20;
}

export function validateFullName(name) {
  return name && name.trim().length >= 2 && name.trim().length <= 100;
}

export function validateExchangeAmount(amount) {
  return validateAmount(amount, 0.1, 100000); // £0.10 - £100,000
}

export function validatePenaltyAmount(amount, contributionAmount) {
  return validateAmount(amount, 0, contributionAmount * 0.5); // Max 50% of contribution
}

export function validatePinCode(pin) {
  // 4-6 digit PIN
  return /^\d{4,6}$/.test(pin);
}

export const ValidationErrors = {
  INVALID_PHONE: 'Phone number must be valid Ghana format (+233 or 024-029)',
  INVALID_EMAIL: 'Email format is invalid',
  INVALID_AMOUNT: 'Amount must be between 0.01 and 1,000,000',
  INVALID_BANK_ACCOUNT: 'Bank account must be 4 digits or valid IBAN',
  INVALID_ID: 'ID number must be between 6-20 characters',
  INVALID_NAME: 'Name must be between 2-100 characters',
  INVALID_PIN: 'PIN must be 4-6 digits',
  AMOUNT_TOO_HIGH: 'Amount exceeds maximum limit',
  AMOUNT_TOO_LOW: 'Amount below minimum limit',
};

export function validateTransactionInput({ phone, amount, pin, idNumber }) {
  const errors = {};
  if (phone && !validatePhoneNumber(phone)) errors.phone = ValidationErrors.INVALID_PHONE;
  if (amount && !validateAmount(amount)) errors.amount = ValidationErrors.INVALID_AMOUNT;
  if (pin && !validatePinCode(pin)) errors.pin = ValidationErrors.INVALID_PIN;
  if (idNumber && !validateIDNumber(idNumber)) errors.id = ValidationErrors.INVALID_ID;
  return { valid: Object.keys(errors).length === 0, errors };
}