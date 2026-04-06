import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScan } from '@/hooks/useScan';
import { barcodeParser } from '@/lib/barcodeParser';
import { offlineSync } from '@/lib/offlineSync';
import { base44 } from '@/api/base44Client';
import { useOfflineStore } from '@/lib/stores/offlineStore';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';

export default function Scanner() {
  const navigate = useNavigate();
  const { videoRef, scanning, error, startScan, stopScan } = useScan();
  const [manualBarcode, setManualBarcode] = useState('');
  const [scannedData, setScannedData] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [transactionType, setTransactionType] = useState('in');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!manualBarcode) return;

    const parsed = barcodeParser.parseBarcode(manualBarcode);
    if (parsed) {
      setScannedData(parsed);
      setManualBarcode('');
    }
  };

  const queueTransaction = useOfflineStore((state) => state.queueTransaction);

  const handleSaveTransaction = async () => {
    if (!scannedData) return;

    setLoading(true);
    try {
      const transaction = {
        barcode_value: scannedData.value,
        type: transactionType,
        quantity: parseInt(quantity),
        timestamp: new Date().toISOString(),
      };

      if (navigator.onLine) {
        await base44.entities.Transaction.create(transaction);
      } else {
        queueTransaction(transaction);
      }

      setScannedData(null);
      setQuantity(1);
      alert('Transaction saved!');
    } catch (err) {
      queueTransaction({
        barcode_value: scannedData.value,
        type: transactionType,
        quantity: parseInt(quantity),
        timestamp: new Date().toISOString(),
      });
      alert('Saved offline. Will sync when online.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Offline Sync Banner */}
      <OfflineSyncBanner />

      {/* Header */}
      <div className="bg-primary text-white p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-xl">←</button>
        <div>
          <h1 className="text-xl font-bold">Scan Barcode</h1>
          <p className="text-sm text-primary-light">Camera or Manual Entry</p>
        </div>
      </div>

      {/* Camera View */}
      {scanning ? (
        <div className="relative w-full">
          <div className="relative bg-black w-full" style={{ aspectRatio: '9/12' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Scanning Frame Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4/5 h-1/2 border-4 border-yellow-400 rounded-lg shadow-lg" style={{
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
              }}></div>
            </div>
            {/* Scanning Status */}
            <div className="absolute top-4 left-4 right-4 bg-black/60 text-white px-3 py-2 rounded-lg text-sm text-center">
              Point camera at barcode
            </div>
          </div>
          <button
            onClick={stopScan}
            className="w-full bg-destructive text-white py-4 font-semibold text-lg hover:bg-red-700 transition"
          >
            Stop Scanning
          </button>
        </div>
      ) : (
        <button
          onClick={startScan}
          className="w-full mx-4 mt-4 aspect-video bg-gradient-to-br from-primary to-primary-light text-white border-2 border-primary rounded-xl flex flex-col items-center justify-center gap-4 hover:shadow-lg transition shadow-md"
        >
          <span className="text-6xl">📷</span>
          <div className="text-center">
            <p className="font-bold text-lg">Start Camera Scan</p>
            <p className="text-sm text-primary-light opacity-90 mt-1">Tap to activate camera</p>
          </div>
        </button>
      )}

      {error && (
        <div className="bg-destructive/10 border-2 border-destructive p-4 m-4 rounded-lg text-destructive text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Manual Entry */}
      <form onSubmit={handleBarcodeSubmit} className="p-4 space-y-3">
        <div>
          <label className="block text-sm font-semibold mb-3 text-foreground/80">Manual Entry</label>
          <input
            type="text"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            onFocus={() => setFocusedInput('barcode')}
            onBlur={() => setFocusedInput(null)}
            placeholder="Scan or type barcode"
            className={`w-full border-2 rounded-lg px-4 py-4 font-mono text-base focus:outline-none transition ${
              focusedInput === 'barcode'
                ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                : 'border-border'
            }`}
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={!manualBarcode.trim()}
          className="w-full bg-primary text-white py-4 rounded-lg font-semibold hover:bg-primary-light transition disabled:opacity-50 disabled:cursor-not-allowed text-base"
        >
          Process Barcode
        </button>
      </form>

      {/* Scanned Data */}
      {scannedData && (
        <div className="p-4 bg-accent/10 border-2 border-accent rounded-xl m-4 space-y-4">
          {/* Product Info */}
          <div className="bg-white rounded-lg p-4 space-y-3">
            <div>
              <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wide mb-1">Product Code</p>
              <p className="font-mono text-lg font-bold text-primary break-all">{scannedData.value}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wide mb-1">Barcode Type</p>
              <p className="text-sm font-medium capitalize text-foreground">{scannedData.type}</p>
            </div>
          </div>

          {/* Transaction Form */}
          <div className="space-y-4 bg-white rounded-lg p-4">
            <div>
              <label className="block text-sm font-semibold mb-3 text-foreground">Type of Transaction</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'in', label: 'Stock In', emoji: '📦' },
                  { value: 'out', label: 'Stock Out', emoji: '📤' },
                  { value: 'adjustment', label: 'Adjust', emoji: '⚙️' },
                  { value: 'damage', label: 'Damage', emoji: '❌' },
                ].map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setTransactionType(type.value)}
                    className={`py-3 rounded-lg font-medium transition border-2 flex flex-col items-center gap-1 ${
                      transactionType === type.value
                        ? 'bg-primary text-white border-primary'
                        : 'bg-muted border-border text-foreground hover:bg-border'
                    }`}
                  >
                    <span className="text-xl">{type.emoji}</span>
                    <span className="text-xs">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3 text-foreground">Quantity</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 bg-muted rounded-lg font-bold text-lg hover:bg-border transition border border-border"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 border-2 border-border rounded-lg px-4 py-3 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-12 h-12 bg-muted rounded-lg font-bold text-lg hover:bg-border transition border border-border"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <button
            onClick={handleSaveTransaction}
            disabled={loading}
            className="w-full bg-accent text-white py-4 rounded-lg font-semibold hover:bg-accent-light transition disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            {loading ? 'Saving...' : '✓ Save Transaction'}
          </button>

          <button
            onClick={() => setScannedData(null)}
            className="w-full bg-muted text-foreground py-3 rounded-lg font-medium hover:bg-border transition border border-border"
          >
            Scan Another
          </button>
        </div>
      )}
    </div>
  );
}