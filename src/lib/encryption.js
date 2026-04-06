/**
 * PII Encryption Layer — Ghana DPA 2012 Compliant
 * AES-256 for Ghana Card, MoMo, banking data
 */

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.REACT_APP_PII_KEY || 'default-insecure-key-change-me'; // 32 bytes
const IV_LENGTH = 16;

export const encrypt = (plaintext) => {
  if (!plaintext) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  let encrypted = cipher.update(String(plaintext), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

export const decrypt = (encryptedData) => {
  if (!encryptedData) return null;
  const [iv, encrypted] = encryptedData.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

export const maskPII = (value, type = 'phone') => {
  if (!value) return null;
  switch (type) {
    case 'phone':
      // +233 24X XXX XXXX → +233 24• ••• ••XX
      return value.replace(/(\+\d{3}\s\d{2})\d{1}(\s\d{3})\s(\d{2})/, '$1• $2 ••$3');
    case 'card':
      // GHA-XXXXXXXX-9 → GHA-••••••-9
      return value.replace(/GHA-(.{6})/, 'GHA-••••••') + value.slice(-2);
    case 'email':
      // user@example.com → u•••@example.com
      return value.replace(/(.)(.*?)(@.*)/, '$1•••$3');
    default:
      return '••••••••';
  }
};

export const redactForLogs = (data) => {
  if (typeof data !== 'object') return data;
  return Object.entries(data).reduce((acc, [k, v]) => {
    if (['phone', 'momo', 'card_id', 'ghana_card'].some(pii => k.toLowerCase().includes(pii))) {
      acc[k] = maskPII(v, k.includes('phone') || k.includes('momo') ? 'phone' : k.includes('card') ? 'card' : 'email');
    } else {
      acc[k] = v;
    }
    return acc;
  }, {});
};