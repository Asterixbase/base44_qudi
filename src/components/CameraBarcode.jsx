import { useEffect, useRef, useState } from 'react';
import { Zap, ZapOff, X } from 'lucide-react';

export default function CameraBarcode({ isActive, onScan, onClose }) {
  const videoRef = useRef(null);
  const [torch, setTorch] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!isActive) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setScanning(true);
        }
      } catch (error) {
        console.error('Camera access denied:', error);
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive]);

  const toggleTorch = async () => {
    try {
      const stream = videoRef.current?.srcObject;
      if (!stream) return;

      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      
      await track.applyConstraints({
        advanced: [{ torch: !torch }],
      });
      setTorch(!torch);
    } catch (error) {
      console.error('Torch error:', error);
    }
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black text-white p-4 flex items-center justify-between">
        <h2 className="font-bold">Barcode Scanner</h2>
        <button onClick={onClose} className="text-2xl">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Scanning Frame */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-64 h-64 border-4 border-primary rounded-lg opacity-70">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary"></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary"></div>
          </div>
        </div>

        {/* Status Text */}
        <div className="absolute bottom-20 left-0 right-0 text-center text-white text-sm">
          {scanning ? (
            <div className="animate-pulse">Scanning...</div>
          ) : (
            <div>Initializing camera...</div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-black p-4 flex gap-3 justify-center">
        <button
          onClick={toggleTorch}
          className="flex items-center gap-2 bg-primary text-white px-4 py-3 rounded-lg font-semibold"
        >
          {torch ? <ZapOff className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
          {torch ? 'Torch Off' : 'Torch On'}
        </button>
      </div>

      {/* Manual Fallback Info */}
      <div className="bg-white p-4 text-center text-sm text-foreground/60">
        📌 ALIGN BARCODE INSIDE FRAME
      </div>
    </div>
  );
}