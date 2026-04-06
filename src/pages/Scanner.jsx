import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CameraBarcode from '@/components/CameraBarcode';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { base44 } from '@/api/base44Client';
import { useOfflineStore } from '@/lib/stores/offlineStore';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';

export default function Scanner() {
  const navigate = useNavigate();
  const [manualBarcode, setManualBarcode] = useState('');
  const [scannedData, setScannedData] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [transactionType, setTransactionType] = useState('in');
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const { searchProduct, getStock } = useBarcodeScanner();
  const { queueTransaction } = useOfflineStore((state) => ({
    queueTransaction: state.queueTransaction,
  }));

  const handleBarcodeScanned = async (barcode) => {
    setCameraActive(false);
    const product = await searchProduct(barcode);
    if (!product) {
      alert('Product not found');
      return;
    }
    const stock = await getStock(product.id);
    setScannedData({
      value: barcode,
      product: product,
      stock: stock,
      type: 'ean13',
    });
  };

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!manualBarcode) return;
    await handleBarcodeScanned(manualBarcode);
    setManualBarcode('');
  };

  const handleSaveTransaction = async () => {
    if (!scannedData) return;

    setLoading(true);
    try {
      const transaction = {
        product_id: scannedData.product?.id,
        product_name: scannedData.product?.name,
        barcode_value: scannedData.value,
        type: transactionType,
        quantity: parseInt(quantity),
        timestamp: new Date().toISOString(),
      };

      if (navigator.onLine) {
        await base44.entities.Transaction.create(transaction);
        setScannedData(null);
        setQuantity(1);
        alert('Transaction saved!');
      } else {
        queueTransaction(transaction);
        setScannedData(null);
        setQuantity(1);
        alert('Saved offline. Will sync when online.');
      }
    } catch (err) {
      queueTransaction({
        barcode_value: scannedData.value,
        type: transactionType,
        quantity: parseInt(quantity),
        timestamp: new Date().toISOString(),
      });
      alert('Error saving transaction. Queued for later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <OfflineSyncBanner />

      {/* Header */}
      <div className="bg-primary text-white p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-xl">←</button>
        <div>
          <h1 className="text-xl font-bold">Scan Barcode</h1>
          <p className="text-sm text-primary-light">Camera or Manual Entry</p>
        </div>
      </div>

      {/* Camera Scanner */}
      <CameraBarcode isActive={cameraActive} onScan={handleBarcodeScanned} onClose={() => setCameraActive(false)} />

      {!cameraActive && !scannedData && (
        <div className="p-4">
          <button
            onClick={() => setCameraActive(true)}
            className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-light transition"
          >
            📷 Start Camera Scan
          </button>
        </div>
      )}

      {/* Manual Entry */}
      {!scannedData && (
        <form onSubmit={handleBarcodeSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-semibold mb-3 text-foreground/80">Manual Entry</label>
            <input
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder="Type barcode"
              className="w-full border-2 border-border rounded-lg px-4 py-4 font-mono text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
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
      )}

      {/* Scanned Data */}
      {scannedData && (
        <div className="p-4 bg-primary/10 border-2 border-primary rounded-xl m-4 space-y-4">
          {/* Product Info */}
          {scannedData.product ? (
            <div className="bg-white rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wide mb-1">Product</p>
                <p className="font-semibold text-lg text-foreground">{scannedData.product.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wide mb-1">SKU</p>
                <p className="font-mono text-sm text-foreground">{scannedData.product.sku}</p>
              </div>
              {scannedData.stock && (
                <div>
                  <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wide mb-1">Current Stock</p>
                  <p className="font-bold text-primary text-lg">{scannedData.stock.quantity} units</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-red-600">Product not found</p>
            </div>
          )}

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
            className="w-full bg-primary text-white py-4 rounded-lg font-semibold hover:bg-primary-light transition disabled:opacity-50 disabled:cursor-not-allowed text-base"
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