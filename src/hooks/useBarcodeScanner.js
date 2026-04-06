import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export const useBarcodeScanner = (onScan, options = {}) => {
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [permission, setPermission] = useState(null);

  const startScan = async () => {
    try {
      setError(null);
      if (scannerRef.current) {
        await scannerRef.current.render();
        setScanning(true);
      }
    } catch (err) {
      setError(err.message || 'Failed to start camera');
      setScanning(false);
    }
  };

  const stopScan = async () => {
    try {
      if (scannerRef.current && scanning) {
        await scannerRef.current.clear();
        setScanning(false);
      }
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
  };

  useEffect(() => {
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      rememberLastUsedCamera: true,
      showTorchButtonIfSupported: true,
      ...options,
    };

    scannerRef.current = new Html5QrcodeScanner('qr-reader', config, false);

    scannerRef.current.render(
      (decodedText) => {
        if (onScan) {
          onScan(decodedText);
        }
      },
      (error) => {
        // Ignore scanner errors (no QR detected)
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [onScan, options]);

  return { scanning, error, startScan, stopScan, scannerRef };
};