/**
 * Biometric + MFA Authentication
 * Compatible with Expo Biometric & web WebAuthn
 */

import { base44 } from '@/api/base44Client';

export const BiometricAuth = {
  /**
   * Web: WebAuthn/FIDO2
   * Expo: expo-local-authentication (fingerprint/face)
   */
  async registerBiometric(userId) {
    if (typeof window === 'undefined') {
      // React Native (Expo) path
      try {
        const LocalAuthentication = await import('expo-local-authentication');
        const available = await LocalAuthentication.hasHardwareAsync();
        if (!available) return { success: false, error: 'No biometric hardware' };
        
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!enrolled) return { success: false, error: 'No fingerprints/face registered on device' };
        
        return { 
          success: true, 
          method: 'expo-biometric',
          message: 'Device biometric enabled for Sikasem',
        };
      } catch (err) {
        return { success: false, error: 'Expo not available: ' + err.message };
      }
    } else {
      // Web path (WebAuthn)
      if (!window.PublicKeyCredential) {
        return { success: false, error: 'WebAuthn not supported' };
      }

      try {
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge: new Uint8Array(32),
            rp: { name: 'Sikasem', id: window.location.hostname },
            user: {
              id: new TextEncoder().encode(userId),
              name: userId,
              displayName: 'Sikasem User',
            },
            pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
            timeout: 60000,
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              residentKey: 'preferred',
            },
          },
        });

        if (credential) {
          await base44.auth.updateMe({ webauthn_credential: credential.id });
          return { success: true, method: 'webauthn', credentialId: credential.id };
        }
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  },

  /**
   * Authenticate with biometric
   */
  async authenticate(userId) {
    if (typeof window === 'undefined') {
      // Expo
      try {
        const LocalAuthentication = await import('expo-local-authentication');
        const result = await LocalAuthentication.authenticateAsync({
          disableDeviceFallback: true,
          reason: 'Verify identity to access sensitive transactions',
        });
        return { success: result.success, method: 'expo-biometric' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Web
      try {
        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge: new Uint8Array(32),
            timeout: 60000,
            userVerification: 'preferred',
          },
        });

        if (assertion) {
          return { success: true, method: 'webauthn' };
        }
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  },

  /**
   * OTP Backup (SMS or Authenticator app)
   */
  async sendOTP(phone) {
    try {
      await base44.functions.invoke('sendOTP', { phone });
      return { success: true, method: 'sms', message: 'Code sent' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async verifyOTP(otp, phone) {
    try {
      const result = await base44.functions.invoke('verifyOTP', { otp, phone });
      return { success: result.valid, message: 'OTP verified' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

export default BiometricAuth;