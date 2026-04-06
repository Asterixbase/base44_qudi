import { useState, useEffect } from 'react';
import { Camera, AlertCircle } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function BarcodeScanner({ onScan, isActive }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [decodedText, setDecodedText] = useState('');

  useEffect(() => {
    if (!isActive || !scanning) return;

    let scanner;

    const initScanner = async () => {
      try {
        setError(null);

        scanner = new Html5QrcodeScanner('qr-reader', {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
          aspectRatio: 1.0,
        });

        scanner.render(
          (decodedText) => {
            setDecodedText(decodedText);
            if (onScan) {
              onScan(decodedText);
            }
          },
          () => {
            // Ignore errors (no QR detected is expected)
          }
        );
      } catch (err) {
        setError(err.message || 'Camera access failed');
        setScanning(false);
      }
    };

    initScanner();

    return () => {
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, [scanning, isActive, onScan]);

  const handleStartScan = () => {
    setScanning(true);
    setError(null);
  };

  const handleStopScan = async () => {
    setScanning(false);
  };

  if (!isActive) return null;

  return (
    <div className="w-full space-y-4">
      {error && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-3 flex gap-2">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="text-sm text-destructive">{error}</div>
        </div>
      )}

      {!scanning ? (
        <button
          onClick={handleStartScan}
          className="w-full aspect-video bg-gradient-to-br from-primary to-primary-light text-white border-2 border-primary rounded-xl flex flex-col items-center justify-center gap-4 hover:shadow-lg transition shadow-md"
        >
          <Camera className="w-16 h-16" />
          <div className="text-center">
            <p className="font-bold text-lg">Start Camera Scan</p>
            <p className="text-sm text-primary-light opacity-90 mt-1">Tap to activate camera</p>
          </div>
        </button>
      ) : (
        <div className="space-y-3">
          <div
            id="qr-reader"
            className="rounded-xl overflow-hidden border-2 border-primary"
            style={{ width: '100%' }}
          />
          <button
            onClick={handleStopScan}
            className="w-full bg-destructive text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
          >
            Stop Scanning
          </button>
        </div>
      )}

      {decodedText && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-4">
          <p className="text-sm font-medium text-green-800">Barcode detected:</p>
          <p className="font-mono text-green-900 mt-2 break-all">{decodedText}</p>
        </div>
      )}
    </div>
  );
}