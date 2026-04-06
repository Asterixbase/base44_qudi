import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { QrCode, Package, Edit2 } from 'lucide-react';

export default function StockTab() {
  const navigate = useNavigate();
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadStock();
  }, []);

  const loadStock = async () => {
    try {
      const data = await base44.entities.Stock.list('-updated_date', 100);
      setStock(data || []);
    } catch (error) {
      console.error('Failed to load stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = stock.filter(s => {
    if (filter === 'low') return s.status === 'low_stock';
    if (filter === 'out') return s.status === 'out_of_stock';
    return true;
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-primary text-white p-4 sticky top-0 z-40">
        <h1 className="text-2xl font-bold">Stock Management</h1>
        <p className="text-sm text-primary-light">{filtered.length} items</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto">
        {[
          { label: 'All', value: 'all' },
          { label: 'Low Stock', value: 'low' },
          { label: 'Out of Stock', value: 'out' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
              filter === f.value ? 'bg-primary text-white' : 'bg-muted text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Stock List */}
      <div className="px-4 py-3 space-y-2">
        {loading ? (
          <p className="text-center text-foreground/60">Loading...</p>
        ) : filtered.length > 0 ? (
          filtered.map(item => (
            <div
              key={item.id}
              onClick={() => navigate(`/stock/${item.id}`)}
              className="bg-card border border-border rounded-lg p-3 hover:border-primary transition cursor-pointer"
            >
              <div className="flex justify-between items-start mb-1">
                <div>
                  <p className="font-semibold text-foreground">{item.product_name}</p>
                  <p className="text-xs text-foreground/60">{item.product_sku}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <div className="flex justify-between text-sm">
                <p><strong>{item.quantity}</strong> pcs</p>
                <p className="text-foreground/60">{item.location}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-foreground/60">No items found</p>
        )}
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-24 right-4 flex flex-col gap-2">
        <button
          onClick={() => navigate('/stock/scan')}
          className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-light shadow-lg"
        >
          <QrCode className="w-6 h-6" />
        </button>
        <button
          onClick={() => navigate('/stock/bulk')}
          className="w-14 h-14 bg-accent text-white rounded-full flex items-center justify-center hover:bg-accent-light shadow-lg"
        >
          <Package className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    in_stock: 'bg-green-100 text-green-800',
    low_stock: 'bg-yellow-100 text-yellow-800',
    out_of_stock: 'bg-red-100 text-red-800',
    expired: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${styles[status] || styles.in_stock}`}>
      {status === 'in_stock' ? 'In Stock' : status === 'low_stock' ? 'Low' : status === 'out_of_stock' ? 'Out' : 'Expired'}
    </span>
  );
}