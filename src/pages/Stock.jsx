import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function Stock() {
  const navigate = useNavigate();
  const [stock, setStock] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStock();
  }, []);

  const loadStock = async () => {
    try {
      const data = await base44.entities.Stock.list();
      setStock(data);
    } catch (error) {
      console.error('Failed to load stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = stock.filter(item => {
    const matchesFilter = filter === 'all' || item.status === filter;
    const matchesSearch =
      item.product_name.toLowerCase().includes(search.toLowerCase()) ||
      item.product_sku.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status) => {
    const colors = {
      in_stock: 'bg-green-100 text-green-800',
      low_stock: 'bg-yellow-100 text-yellow-800',
      out_of_stock: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-white p-4 sticky top-0 z-50">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="text-xl">←</button>
          <h1 className="text-xl font-bold">Stock Levels</h1>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 rounded-lg text-foreground placeholder-foreground/50"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 p-4 overflow-x-auto">
        {['all', 'in_stock', 'low_stock', 'out_of_stock', 'expired'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition ${
              filter === status
                ? 'bg-primary text-white'
                : 'bg-muted text-foreground hover:bg-border'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center p-8">
          <p className="text-2xl mb-2">📦</p>
          <p className="text-foreground/60">No products found</p>
        </div>
      ) : (
        <div className="space-y-2 p-4">
          {filtered.map(item => (
            <div
              key={item.id}
              onClick={() => navigate(`/stock/${item.id}`)}
              className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{item.product_name}</p>
                  <p className="text-xs text-foreground/60">{item.product_sku}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(item.status)}`}>
                  {item.status.replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-primary">{item.quantity}</p>
                  <p className="text-xs text-foreground/60">units</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-foreground/60">Location: {item.location}</p>
                  {item.last_counted && (
                    <p className="text-xs text-foreground/60">
                      Last: {new Date(item.last_counted).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => navigate('/stock/new')}
        className="fixed bottom-24 right-4 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center text-2xl shadow-lg hover:bg-primary-light transition"
      >
        +
      </button>
    </div>
  );
}