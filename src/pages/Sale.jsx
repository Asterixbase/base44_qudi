import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useOfflineStore } from '@/lib/stores/offlineStore';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';
import { Plus, Trash2, Search } from 'lucide-react';

export default function Sale() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const { queueTransaction } = useOfflineStore();

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  const loadProducts = async () => {
    try {
      const data = await base44.entities.Product.list();
      setProducts(data || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setSearchTerm('');
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const total = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const totalGHS = (total / 100).toFixed(2);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    setLoading(true);
    try {
      // Create transaction record for each item sold
      const transactions = cart.map(item => ({
        product_id: item.id,
        product_name: item.name,
        type: 'out',
        quantity: item.quantity,
        reference: `SALE-${Date.now()}`,
      }));

      if (navigator.onLine) {
        await Promise.all(
          transactions.map(t => base44.entities.Transaction.create(t))
        );
      } else {
        // Queue offline
        transactions.forEach(t => queueTransaction(t));
      }

      // Reset cart and show success
      setCart([]);
      alert(`Sale recorded: GHS ${totalGHS} (${paymentMethod})`);
      navigate('/dashboard');
    } catch (error) {
      console.error('Checkout failed:', error);
      // Queue on error
      cart.forEach(item => {
        queueTransaction({
          product_id: item.id,
          product_name: item.name,
          type: 'out',
          quantity: item.quantity,
          reference: `SALE-${Date.now()}`,
        });
      });
      alert('Sale queued (offline)');
      setCart([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <OfflineSyncBanner />

      {/* Header */}
      <div className="bg-primary text-white p-4 sticky top-0 z-40">
        <button onClick={() => navigate('/dashboard')} className="text-lg mb-2">←</button>
        <h1 className="text-2xl font-bold">Record Sale</h1>
      </div>

      {/* Cart Summary (sticky top) */}
      {cart.length > 0 && (
        <div className="bg-accent/10 border-b-2 border-accent sticky top-16 z-30 p-4 space-y-2">
          <div className="flex justify-between items-center">
            <p className="font-semibold text-foreground">Cart Items: {cart.length}</p>
            <p className="text-2xl font-bold text-accent">GHS {totalGHS}</p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-foreground/40" />
          <input
            type="text"
            placeholder="Search product name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border-2 border-border rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Product List */}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {filteredProducts.length > 0 ? (
            filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="w-full bg-card border-2 border-border hover:border-primary rounded-lg p-3 text-left transition"
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="font-semibold text-foreground">{product.name}</p>
                  <p className="text-sm font-bold text-accent">GHS {(product.unit_price / 100).toFixed(2)}</p>
                </div>
                <p className="text-xs text-foreground/60">{product.sku || 'No SKU'}</p>
              </button>
            ))
          ) : (
            <div className="text-center py-8 text-foreground/60">
              {searchTerm ? 'No products found' : 'Search to add items'}
            </div>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="px-4 py-4 space-y-2">
        <h2 className="text-xs font-bold text-foreground/60 uppercase tracking-widest">Cart</h2>
        
        {cart.length > 0 ? (
          <div className="space-y-2">
            {cart.map(item => (
              <div key={item.id} className="bg-card border-2 border-border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{item.name}</p>
                    <p className="text-sm text-foreground/60">GHS {(item.unit_price / 100).toFixed(2)} each</p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Quantity Control */}
                <div className="flex items-center gap-2 bg-muted rounded-lg p-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-8 h-8 bg-border hover:bg-primary/20 rounded font-bold"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                    className="flex-1 bg-white border border-border rounded px-2 py-1 text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-8 h-8 bg-border hover:bg-primary/20 rounded font-bold"
                  >
                    +
                  </button>
                  <p className="text-sm font-semibold text-accent whitespace-nowrap">
                    GHS {((item.unit_price * item.quantity) / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-foreground/60">
            <p className="text-sm">Cart is empty. Search to add items.</p>
          </div>
        )}
      </div>

      {/* Payment Method & Checkout (fixed bottom) */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-border p-4 space-y-3">
          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {['cash', 'momo', 'credit'].map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 rounded-lg font-medium transition border-2 ${
                    paymentMethod === method
                      ? 'bg-primary text-white border-primary'
                      : 'bg-muted border-border hover:border-primary'
                  }`}
                >
                  {method === 'cash' && '💵'}
                  {method === 'momo' && '📱'}
                  {method === 'credit' && '💳'}
                  <span className="text-xs block mt-1 capitalize">{method}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading || cart.length === 0}
            className="w-full bg-accent text-white py-4 rounded-lg font-bold text-lg hover:bg-accent-light transition disabled:opacity-50"
          >
            {loading ? 'Processing...' : `Complete Sale - GHS ${totalGHS}`}
          </button>
        </div>
      )}
    </div>
  );
}