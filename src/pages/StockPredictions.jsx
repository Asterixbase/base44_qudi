import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';

export default function StockPredictions() {
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('urgency');

  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('generateStockPredictions', {});
      setPredictions(response.data.predictions || []);
    } catch (error) {
      console.error('Failed to load predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAndSorted = () => {
    let filtered = predictions;

    // Apply filter
    if (filter === 'urgent') {
      filtered = filtered.filter(p => p.stock_status === 'urgent');
    } else if (filter === 'warning') {
      filtered = filtered.filter(p => p.stock_status === 'warning');
    } else if (filter === 'healthy') {
      filtered = filtered.filter(p => p.stock_status === 'healthy');
    } else if (filter === 'no_data') {
      filtered = filtered.filter(p => p.confidence === 'low');
    }

    // Apply sort
    if (sortBy === 'urgency') {
      const priority = { urgent: 0, warning: 1, healthy: 2, insufficient_data: 3 };
      filtered.sort((a, b) => priority[a.stock_status] - priority[b.stock_status]);
    } else if (sortBy === 'reorder_soon') {
      filtered.sort((a, b) => a.days_until_reorder - b.days_until_reorder);
    } else if (sortBy === 'velocity') {
      filtered.sort((a, b) => b.daily_velocity - a.daily_velocity);
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.product_name.localeCompare(b.product_name));
    }

    return filtered;
  };

  const displayData = getFilteredAndSorted();
  const stats = {
    total: predictions.length,
    urgent: predictions.filter(p => p.stock_status === 'urgent').length,
    warning: predictions.filter(p => p.stock_status === 'warning').length,
    healthy: predictions.filter(p => p.stock_status === 'healthy').length,
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'urgent':
        return 'bg-destructive/10 border-destructive text-destructive';
      case 'warning':
        return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      case 'healthy':
        return 'bg-green-100 border-green-500 text-green-700';
      default:
        return 'bg-gray-100 border-gray-400 text-gray-700';
    }
  };

  const getStatusEmoji = (status) => {
    switch (status) {
      case 'urgent':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'healthy':
        return '✅';
      default:
        return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Offline Sync Banner */}
      <OfflineSyncBanner />

      {/* Header */}
      <div className="bg-primary text-white p-4 sticky top-0 z-40">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="text-xl">←</button>
          <h1 className="text-2xl font-bold">Stock Predictions</h1>
        </div>
        <p className="text-sm text-primary-light ml-12">AI-powered reorder recommendations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 p-4">
        <StatCard label="Total" value={stats.total} icon="📦" />
        <StatCard label="Urgent" value={stats.urgent} icon="🚨" highlight />
        <StatCard label="Warning" value={stats.warning} icon="⚠️" />
        <StatCard label="Healthy" value={stats.healthy} icon="✅" />
      </div>

      {/* Controls */}
      <div className="px-4 space-y-3">
        <div>
          <label className="block text-sm font-semibold mb-2 text-foreground/80">Filter by Status</label>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'urgent', label: 'Urgent' },
              { value: 'warning', label: 'Warning' },
              { value: 'healthy', label: 'Healthy' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                  filter === f.value
                    ? 'bg-primary text-white'
                    : 'bg-muted text-foreground hover:bg-border'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-foreground/80">Sort by</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full border-2 border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="urgency">Urgency (Most Urgent First)</option>
            <option value="reorder_soon">Days Until Reorder</option>
            <option value="velocity">Sales Velocity (Fastest Moving)</option>
            <option value="name">Product Name (A-Z)</option>
          </select>
        </div>

        <button
          onClick={loadPredictions}
          disabled={loading}
          className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary-light transition disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : '🔄 Refresh Predictions'}
        </button>
      </div>

      {/* Predictions List */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-foreground/60">Analyzing stock data...</p>
            </div>
          </div>
        ) : displayData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-2xl mb-2">📭</p>
            <p className="text-foreground/60">No predictions match this filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayData.map(prediction => (
              <div
                key={prediction.product_id}
                className="bg-card border-2 border-border rounded-lg p-4 hover:shadow-md transition"
              >
                {/* Product Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-2xl">{getStatusEmoji(prediction.stock_status)}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground">{prediction.product_name}</h3>
                    <p className="text-xs text-foreground/60">{prediction.product_sku}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(prediction.stock_status)}`}>
                    {prediction.stock_status.toUpperCase()}
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                  <MetricBox label="Current Stock" value={prediction.current_quantity} unit="units" />
                  <MetricBox label="Reorder Point" value={prediction.reorder_point} unit="units" />
                  <MetricBox label="Daily Velocity" value={prediction.daily_velocity} unit="units/day" />
                  <MetricBox label="Optimal Order" value={prediction.optimal_order_quantity} unit="units" />
                </div>

                {/* Prediction Details */}
                <div className="bg-primary/5 rounded-lg p-3 mb-3 border border-primary/10">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-foreground/70">Predicted Reorder Date</p>
                    <p className="text-sm font-bold text-primary">{prediction.predicted_reorder_date || 'N/A'}</p>
                  </div>
                  <p className="text-xs text-foreground/60">
                    {prediction.days_until_reorder === Infinity
                      ? 'Insufficient data'
                      : `${prediction.days_until_reorder} days from now`}
                  </p>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => navigate(`/purchase-orders?product=${prediction.product_id}`)}
                  className="w-full bg-accent text-white py-2 rounded-lg text-sm font-medium hover:bg-accent-light transition"
                >
                  Create Purchase Order
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, highlight }) {
  return (
    <div className={`p-3 rounded-lg border-2 ${highlight ? 'bg-destructive/10 border-destructive' : 'bg-card border-border'}`}>
      <p className="text-2xl mb-1">{icon}</p>
      <p className="text-xs text-foreground/60 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-destructive' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}

function MetricBox({ label, value, unit }) {
  return (
    <div className="bg-muted rounded p-2">
      <p className="text-xs text-foreground/60 mb-1">{label}</p>
      <p className="font-bold text-foreground">
        {typeof value === 'number' ? value.toFixed(1) : value}
        <span className="text-xs text-foreground/60 ml-1">{unit}</span>
      </p>
    </div>
  );
}