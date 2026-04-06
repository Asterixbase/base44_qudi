import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Search } from 'lucide-react';

export default function QuickSale() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);

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
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item => (item.id === productId ? { ...item, quantity } : item))
    );
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const total = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) / 100;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      // Create transactions for each item
      for (const item of cart) {
        await base44.entities.Transaction.create({
          product_id: item.id,
          product_name: item.name,
          type: 'out',
          quantity: item.quantity,
          reference: `SALE-${Date.now()}`,
        });
      }
      navigate('/sale-ok');
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Error recording sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="bg-primary text-white p-4 sticky top-0 z-40">
        <button onClick={() => navigate(-1)} className="text-lg mb-2">←</button>
        <h1 className="text-2xl font-bold">Quick sale</h1>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-foreground/40" />
          <input
            type="text"
            placeholder="Search product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border-2 border-border rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Product List */}
      <div className="px-4 pb-4 max-h-60 overflow-y-auto space-y-2">
        {filteredProducts.slice(0, 5).map(product => (
          <button
            key={product.id}
            onClick={() => addToCart(product)}
            className="w-full bg-card border border-border rounded-lg p-3 text-left hover:border-primary transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-foreground">{product.name}</p>
                <p className="text-xs text-foreground/60">{product.sku}</p>
              </div>
              <p className="font-bold text-accent">GHS {(product.unit_price / 100).toFixed(2)}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Cart Items */}
      <div className="px-4 py-3 space-y-2">
        <h2 className="text-xs font-bold text-foreground/60 uppercase">Cart</h2>
        {cart.length > 0 ? (
          <div className="space-y-2">
            {cart.map(item => (
              <div key={item.id} className="bg-card border border-border rounded-lg p-3 flex justify-between items-center">
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{item.name}</p>
                  <p className="text-sm text-foreground/60">GHS {(item.unit_price / 100).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 bg-muted rounded">−</button>
                  <span className="w-6 text-center font-bold">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 bg-muted rounded">+</button>
                  <button onClick={() => removeFromCart(item.id)} className="text-destructive ml-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-8 text-foreground/60">Cart is empty</p>
        )}
      </div>

      {/* Checkout */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4 space-y-3">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold">Total</p>
            <p className="text-2xl font-bold text-primary">GHS {total.toFixed(2)}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Payment</label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {['cash', 'momo', 'credit'].map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 rounded-lg font-medium transition border-2 ${
                    paymentMethod === method
                      ? 'bg-primary text-white border-primary'
                      : 'bg-muted border-border'
                  }`}
                >
                  {method === 'cash' && '💵'}
                  {method === 'momo' && '📱'}
                  {method === 'credit' && '💳'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading || cart.length === 0}
            className="w-full bg-accent text-white py-4 rounded-lg font-bold hover:bg-accent-light transition disabled:opacity-50"
          >
            {loading ? 'Processing...' : `Confirm sale →`}
          </button>
        </div>
      )}
    </div>
  );
}