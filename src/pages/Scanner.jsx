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
    <div className="min-h-screen bg-background pb-20">
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
        <div className="relative bg-black aspect-square">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 border-4 border-yellow-400 border-opacity-50"></div>
          <button
            onClick={stopScan}
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-destructive text-white px-6 py-2 rounded-lg font-medium"
          >
            Stop Camera
          </button>
        </div>
      ) : (
        <button
          onClick={startScan}
          className="w-full aspect-square bg-primary/10 border-2 border-dashed border-primary m-4 rounded-lg flex flex-col items-center justify-center gap-3 hover:bg-primary/20 transition"
        >
          <span className="text-5xl">📷</span>
          <p className="font-medium text-primary">Start Camera</p>
        </button>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive p-4 m-4 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Manual Entry */}
      <form onSubmit={handleBarcodeSubmit} className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Barcode / QR Code</label>
          <input
            type="text"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            placeholder="Enter or scan barcode"
            className="w-full border rounded-lg px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
        </div>
        <button
          type="submit"
          className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-light transition"
        >
          Process Barcode
        </button>
      </form>

      {/* Scanned Data */}
      {scannedData && (
        <div className="p-4 bg-accent/10 border border-accent rounded-lg m-4 space-y-4">
          <div>
            <p className="text-xs text-foreground/60 uppercase">Barcode Type</p>
            <p className="font-semibold capitalize">{scannedData.type}</p>
          </div>
          <div>
            <p className="text-xs text-foreground/60 uppercase">Barcode Value</p>
            <p className="font-mono text-sm break-all">{scannedData.value}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Transaction Type</label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="in">Stock In</option>
              <option value="out">Stock Out</option>
              <option value="adjustment">Adjustment</option>
              <option value="damage">Damage</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Quantity</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            onClick={handleSaveTransaction}
            disabled={loading}
            className="w-full bg-accent text-white py-3 rounded-lg font-medium hover:bg-accent-light transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Transaction'}
          </button>

          <button
            onClick={() => setScannedData(null)}
            className="w-full bg-muted text-foreground py-2 rounded-lg text-sm font-medium hover:bg-border transition"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}