/**
 * Device Fingerprinting — Prevent fraud via device/app tampering
 * Compatible with Expo (React Native) and web
 */

import crypto from 'crypto';

export class DeviceFingerprint {
  static async generate() {
    const components = {
      // Web/Browser-specific
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: `${window.innerWidth}x${window.innerHeight}`,
      colorDepth: screen.colorDepth,
      timezone_offset: new Date().getTimezoneOffset(),
      
      // Canvas fingerprinting (detects headless/modified environments)
      canvasHash: DeviceFingerprint.getCanvasHash(),
      
      // Local storage availability (checks for modifications)
      localStorageAvailable: (() => {
        try {
          const test = '__test__';
          localStorage.setItem(test, test);
          localStorage.removeItem(test);
          return true;
        } catch (e) {
          return false;
        }
      })(),
    };

    // For Expo/React Native apps, add native components
    if (typeof window !== 'undefined' && window.Expo) {
      const * as Device from 'expo-device';
      const * as Constants from 'expo-constants';
      Object.assign(components, {
        deviceId: Device.deviceId,
        modelId: Device.modelId,
        osVersion: Device.osVersion,
        expoVersion: Constants.expoVersion,
      });
    }

    return {
      fingerprint: DeviceFingerprint.hash(components),
      components,
      timestamp: Date.now(),
    };
  }

  static getCanvasHash() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('sikasem🇬🇭', 2, 2);
      return canvas.toDataURL().substring(0, 50); // Short hash
    } catch {
      return 'canvas_unavailable';
    }
  }

  static hash(obj) {
    const str = JSON.stringify(obj);
    return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
  }

  static async verify(storedFingerprint) {
    const current = await DeviceFingerprint.generate();
    const match = current.fingerprint === storedFingerprint;
    
    return {
      match,
      confidence: match ? 'high' : 'low',
      risk: !match ? 'DEVICE_CHANGED' : null,
      currentFingerprint: current.fingerprint,
    };
  }
}

export default DeviceFingerprint;