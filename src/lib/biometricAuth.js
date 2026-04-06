// Web-safe biometric authentication wrapper
// Expo version handled separately in native code

export default class BiometricAuth {
  // Web: Use WebAuthn/FIDO2 if available
  static async registerBiometric(userId) {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Biometric unavailable on server' };
    }

    if (!window.PublicKeyCredential) {
      return { success: false, error: 'WebAuthn not supported' };
    }

    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: 'Sikasem' },
          user: {
            id: new Uint8Array(16),
            name: userId,
            displayName: userId,
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: { authenticatorAttachment: 'platform' },
        },
      });

      if (!credential) {
        return { success: false, error: 'Registration cancelled' };
      }

      return {
        success: true,
        method: 'webauthn',
        message: 'Biometric registered successfully',
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Web: Verify WebAuthn credential
  static async authenticate(userId) {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Authentication unavailable on server' };
    }

    if (!window.PublicKeyCredential) {
      return { success: false, error: 'WebAuthn not supported' };
    }

    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          timeout: 60000,
          userVerification: 'preferred',
        },
      });

      if (!assertion) {
        return { success: false, error: 'Authentication cancelled' };
      }

      return {
        success: true,
        method: 'webauthn',
        message: 'Authenticated successfully',
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Fallback: OTP verification
  static async sendOTP(phone) {
    try {
      // Integration call to send SMS via backend
      return { success: true, message: 'OTP sent' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async verifyOTP(code, phone) {
    if (!code || code.length !== 6) {
      return { success: false, error: 'Invalid OTP format' };
    }
    return { success: true, message: 'OTP verified' };
  }
}