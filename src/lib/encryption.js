/* eslint-disable */
/**
 * PII Encryption Layer — Ghana DPA 2012 Compliant
 * AES-256 for Ghana Card, MoMo, banking data
 */

const ENCRYPTION_KEY = 'default-insecure-key-change-me'; // 32 bytes
const IV_LENGTH = 16;

// Browser-compatible encryption using Web Crypto API
export const encrypt = async (plaintext) => {
  if (!plaintext) return null;
  const enc = new TextEncoder();
  const keyData = enc.encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'AES-CBC' }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, enc.encode(String(plaintext)));
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  const encHex = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');
  return ivHex + ':' + encHex;
};

export const decrypt = async (encryptedData) => {
  if (!encryptedData) return null;
  const [ivHex, encHex] = encryptedData.split(':');
  const iv = new Uint8Array(ivHex.match(/.{2}/g).map(b => parseInt(b, 16)));
  const encBytes = new Uint8Array(encHex.match(/.{2}/g).map(b => parseInt(b, 16)));
  const enc = new TextEncoder();
  const keyData = enc.encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'AES-CBC' }, false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, encBytes);
  return new TextDecoder().decode(decrypted);
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