import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';

export default function StockAlerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);

  useEffect(() => {
    checkStockLevels();
  }, []);

  const checkStockLevels = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('checkStockLevels', {});
      setAlerts(response.data.items || []);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to check stock levels:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Offline Sync Banner */}
      <OfflineSyncBanner />

      {/* Header */}
      <div className="bg-primary text-white p-4 sticky top-0 z-40">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="text-xl">←</button>
          <h1 className="text-2xl font-bold">Stock Alerts</h1>
        </div>
        <p className="text-sm text-primary-light ml-12">
          {lastChecked && `Last checked: ${lastChecked}`}
        </p>
      </div>

      {/* Refresh Button */}
      <div className="p-4">
        <button
          onClick={checkStockLevels}
          disabled={loading}
          className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-light transition disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Check Stock Levels'}
        </button>
      </div>

      {/* Loading State */}
      {loading && alerts.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-foreground/60">Checking stock levels...</p>
          </div>
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12 px-4">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground">All stock levels healthy</p>
          <p className="text-sm text-foreground/60 mt-2">No products below reorder threshold</p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className="bg-red-50 border-2 border-red-200 rounded-lg p-4 space-y-2"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900">{alert.productName}</p>
                  <p className="text-sm text-red-800">SKU: {alert.sku}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3 pl-8">
                <div>
                  <p className="text-xs text-red-700 uppercase">Current Stock</p>
                  <p className="text-2xl font-bold text-red-600">
                    {alert.currentQuantity}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-red-700 uppercase">Reorder Level</p>
                  <p className="text-2xl font-bold text-red-600">
                    {alert.reorderLevel}
                  </p>
                </div>
              </div>

              <div className="bg-red-100 rounded px-3 py-2 mt-3 ml-8">
                <p className="text-sm font-medium text-red-900">
                  Short by {alert.shortage} units
                </p>
              </div>

              <div className="text-xs text-red-700 ml-8 mt-2">
                Location: {alert.location}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}