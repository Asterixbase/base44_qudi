import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import BarcodeScanner from '@/components/BarcodeScanner';
import { barcodeParser } from '@/lib/barcodeParser';
import { ChevronLeft, Check, AlertCircle } from 'lucide-react';

export default function BarcodeInventoryScanner() {
  const navigate = useNavigate();
  const [scanMode, setScanMode] = useState('active'); // active, result
  const [scannedProduct, setScannedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [transactionType, setTransactionType] = useState('out');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [products, setProducts] = useState([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const prods = await base44.entities.Product.list();
      setProducts(prods);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const handleBarcodeScan = async (barcodeValue) => {
    try {
      setLoading(true);
      const parsed = barcodeParser.parseBarcode(barcodeValue);

      // Search for product by barcode or SKU
      const product = products.find(
        p => p.barcode === barcodeValue || p.sku === barcodeValue || p.id === barcodeValue
      );

      if (product) {
        // Fetch stock info
        const stockList = await base44.entities.Stock.filter({
          product_id: product.id,
        });

        setScannedProduct({
          ...product,
          stock: stockList?.[0] || null,
          barcodeData: parsed,
        });
        setScanMode('result');
        setQuantity(1);
        setMessage('');
      } else {
        setMessage(`Product not found: ${barcodeValue}`);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error processing barcode:', error);
      setMessage('Error scanning barcode');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTransaction = async () => {
    if (!scannedProduct) return;

    setLoading(true);
    try {
      // Create transaction record
      await base44.entities.Transaction.create({
        product_id: scannedProduct.id,
        product_name: scannedProduct.name,
        type: transactionType,
        quantity: parseInt(quantity),
        reference: `SCAN-${new Date().getTime()}`,
      });

      // Update stock if available
      if (scannedProduct.stock) {
        const newQuantity =
          transactionType === 'in'
            ? scannedProduct.stock.quantity + parseInt(quantity)
            : Math.max(0, scannedProduct.stock.quantity - parseInt(quantity));

        await base44.entities.Stock.update(scannedProduct.stock.id, {
          quantity: newQuantity,
          status:
            newQuantity === 0
              ? 'out_of_stock'
              : newQuantity < scannedProduct.reorder_level
              ? 'low_stock'
              : 'in_stock',
        });
      }

      setMessage('✓ Transaction saved successfully');
      setTimeout(() => {
        setScannedProduct(null);
        setScanMode('active');
        setMessage('');
      }, 1500);
    } catch (error) {
      console.error('Failed to save transaction:', error);
      setMessage('Error saving transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-white p-4 sticky top-0 z-40 flex items-center gap-3">
        <button
          onClick={() => navigate('/stock')}
          className="flex items-center justify-center w-10 h-10 hover:bg-primary-light rounded-lg transition"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Barcode Scanner</h1>
          <p className="text-sm text-primary-light opacity-80">Scan items to update inventory</p>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div
          className={`mx-4 mt-4 p-3 rounded-lg text-sm font-medium ${
            message.includes('✓')
              ? 'bg-green-50 text-green-800 border border-green-300'
              : 'bg-red-50 text-red-800 border border-red-300'
          }`}
        >
          {message}
        </div>
      )}

      {/* Scanner Active Mode */}
      {scanMode === 'active' && (
        <div className="p-4">
          <BarcodeScanner isActive={true} onScan={handleBarcodeScan} />
          <p className="text-center text-foreground/60 text-sm mt-6 px-4">
            Point your camera at a barcode or QR code to scan a product
          </p>
        </div>
      )}

      {/* Result Mode */}
      {scanMode === 'result' && scannedProduct && (
        <div className="p-4 space-y-4">
          {/* Product Info Card */}
          <div className="bg-card border-2 border-accent rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="font-bold text-lg text-foreground">{scannedProduct.name}</h2>
                <p className="text-sm text-foreground/60 mt-1">SKU: {scannedProduct.sku}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-foreground/70 uppercase">Unit Price</p>
                <p className="text-lg font-bold text-accent">GHS {scannedProduct.unit_price}</p>
              </div>
            </div>

            {scannedProduct.stock && (
              <div className="grid grid-cols-3 gap-2 bg-primary/5 rounded p-3 mt-2">
                <div>
                  <p className="text-xs text-foreground/60 uppercase font-semibold">Current Stock</p>
                  <p className="text-xl font-bold text-primary">{scannedProduct.stock.quantity}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground/60 uppercase font-semibold">Reorder Level</p>
                  <p className="text-xl font-bold text-foreground">{scannedProduct.reorder_level}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground/60 uppercase font-semibold">Status</p>
                  <p
                    className={`text-sm font-bold ${
                      scannedProduct.stock.status === 'in_stock'
                        ? 'text-green-600'
                        : scannedProduct.stock.status === 'low_stock'
                        ? 'text-amber-600'
                        : 'text-red-600'
                    }`}
                  >
                    {scannedProduct.stock.status.replace('_', ' ')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-semibold mb-3 text-foreground">Type</label>
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
                  <span className="text-lg">{type.emoji}</span>
                  <span className="text-xs">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
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
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
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

          {/* Action Buttons */}
          <button
            onClick={handleSaveTransaction}
            disabled={loading}
            className="w-full bg-accent text-white py-4 rounded-lg font-semibold hover:bg-accent-light transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? 'Saving...' : <><Check className="w-5 h-5" /> Save Transaction</>}
          </button>

          <button
            onClick={() => setScanMode('active')}
            className="w-full bg-muted text-foreground py-3 rounded-lg font-medium hover:bg-border transition border border-border"
          >
            Scan Another
          </button>
        </div>
      )}
    </div>
  );
}