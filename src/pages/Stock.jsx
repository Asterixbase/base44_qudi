import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';

export default function Stock() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Stock.list();
      setProducts(data);
    } catch (err) {
      console.error('Stock fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = products.filter(p => {
    const matchesSearch = p.product_name?.toLowerCase().includes(search.toLowerCase()) ||
                         p.product_sku?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' ||
                         (filter === 'low' && p.status === 'low_stock') ||
                         (filter === 'out' && p.status === 'out_of_stock');
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'in_stock': return 'bg-green-50 border-green-200';
      case 'low_stock': return 'bg-amber-50 border-amber-200';
      case 'out_of_stock': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <OfflineSyncBanner />

      {/* Header */}
      <div className="bg-primary text-white p-4">
        <h1 className="text-2xl font-bold">📦 Stock</h1>
        <p className="text-sm text-primary-light">Manage inventory</p>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2">
          <Search className="w-5 h-5 text-foreground/40" />
          <input
            type="text"
            placeholder="Search product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 outline-none bg-transparent"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 flex gap-2 border-b border-border overflow-x-auto">
        {['all', 'low', 'out'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full font-medium whitespace-nowrap ${
              filter === f ? 'bg-primary text-white' : 'bg-muted text-foreground'
            }`}
          >
            {f === 'all' && 'All'}
            {f === 'low' && '⚠️ Low'}
            {f === 'out' && '❌ Out'}
          </button>
        ))}
      </div>

      {/* Products List */}
      {loading ? (
        <div className="p-4 text-center text-foreground/60">Loading...</div>
      ) : (
        <div className="p-4 space-y-3">
          {filtered.map(product => (
            <div
              key={product.id}
              onClick={() => navigate(`/product/${product.id}`)}
              className={`p-4 rounded-lg border cursor-pointer ${getStatusColor(product.status)}`}
            >
              <p className="font-semibold text-foreground">{product.product_name}</p>
              <p className="text-xs text-foreground/60">{product.product_sku}</p>
              <div className="flex justify-between items-end mt-2">
                <p className="font-bold text-lg text-foreground">{product.quantity}</p>
                <span className="text-xs font-medium text-foreground/60">{product.location}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => navigate('/scan')}
        className="fixed bottom-24 right-4 bg-primary text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg text-2xl hover:bg-primary-light"
      >
        📷
      </button>
    </div>
  );
}