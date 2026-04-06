import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { analyzeStockHealth } from '@/lib/stockPrediction';

export default function StockPredictionDashboard() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    try {
      const [products, stock, transactions] = await Promise.all([
        base44.entities.Product.list(),
        base44.entities.Stock.list(),
        base44.entities.Transaction.list(),
      ]);

      const analysis = products.map((product) => {
        const stockItem = stock.find((s) => s.product_id === product.id);
        if (!stockItem) return null;

        return analyzeStockHealth(stockItem, product, transactions);
      });

      setPredictions(
        analysis.filter((p) => p !== null).sort((a, b) => {
          // Prioritize critical, then by nearest reorder date
          if (a.status !== b.status) {
            const statusPriority = { critical: 0, warning: 1, healthy: 2 };
            return statusPriority[a.status] - statusPriority[b.status];
          }
          return (
            (a.daysUntilReorder || 999) - (b.daysUntilReorder || 999)
          );
        })
      );
      setError(null);
    } catch (err) {
      setError('Failed to load predictions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      critical: 'bg-red-50 border-red-200',
      warning: 'bg-yellow-50 border-yellow-200',
      healthy: 'bg-green-50 border-green-200',
    };
    return colors[status] || 'bg-gray-50';
  };

  const getStatusIcon = (status) => {
    if (status === 'critical') return <AlertTriangle className="w-5 h-5 text-red-600" />;
    if (status === 'warning') return <TrendingDown className="w-5 h-5 text-yellow-600" />;
    return <CheckCircle2 className="w-5 h-5 text-green-600" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-900 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm text-blue-900">
        <p className="font-medium mb-1">Stock Level Predictions</p>
        <p className="text-xs">Based on {predictions.length} products and historical velocity</p>
      </div>

      {predictions.length === 0 ? (
        <div className="text-center py-8 text-foreground/60">
          <p>No stock data available for predictions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {predictions.map((pred) => (
            <div
              key={pred.productId}
              className={`border rounded-lg p-4 ${getStatusColor(pred.status)}`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0">{getStatusIcon(pred.status)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {pred.productName}
                  </p>
                  <p className="text-xs text-foreground/60">{pred.status.toUpperCase()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div className="bg-white/50 rounded p-2">
                  <p className="text-xs text-foreground/60">Current Stock</p>
                  <p className="font-bold text-foreground">{pred.currentStock}</p>
                </div>
                <div className="bg-white/50 rounded p-2">
                  <p className="text-xs text-foreground/60">Daily Velocity</p>
                  <p className="font-bold text-foreground">{pred.dailyVelocity}</p>
                </div>
                <div className="bg-white/50 rounded p-2">
                  <p className="text-xs text-foreground/60">Optimal Level</p>
                  <p className="font-bold text-foreground">
                    {pred.optimalLevel || '—'}
                  </p>
                </div>
                <div className="bg-white/50 rounded p-2">
                  <p className="text-xs text-foreground/60">Reorder Level</p>
                  <p className="font-bold text-foreground">{pred.reorderLevel}</p>
                </div>
              </div>

              {pred.predictedReorderDate && (
                <div className="bg-white/50 rounded p-2">
                  <p className="text-xs text-foreground/60 mb-1">Predicted Reorder Date</p>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-foreground">
                      {pred.predictedReorderDate.toLocaleDateString()}
                    </p>
                    <span className="text-xs font-medium text-foreground/70">
                      {pred.daysUntilReorder} days
                    </span>
                  </div>
                </div>
              )}

              {pred.avgDaily && (
                <div className="mt-3 text-xs text-foreground/60 space-y-1">
                  <p>
                    Average daily usage: <span className="font-semibold">{pred.avgDaily}</span> units
                  </p>
                  <p>
                    Safety stock (2σ): <span className="font-semibold">{pred.safetyStock}</span> units
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={loadPredictions}
        className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-light transition"
      >
        Refresh Predictions
      </button>
    </div>
  );
}