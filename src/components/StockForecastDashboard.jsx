import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import StockForecastAlert from './StockForecastAlert';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function StockForecastDashboard() {
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('critical'); // critical, high, all

  useEffect(() => {
    loadForecasts();
  }, []);

  const loadForecasts = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.StockForecast.list('-forecast_date', 100);
      setForecasts(data || []);
    } catch (error) {
      console.error('Failed to load forecasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await base44.functions.invoke('predictStockLevels', {});
      await loadForecasts();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredForecasts = forecasts.filter(f => {
    if (filter === 'all') return true;
    if (filter === 'critical') return f.urgency === 'critical' || f.urgency === 'high';
    return f.urgency === filter;
  });

  const stats = {
    critical: forecasts.filter(f => f.urgency === 'critical').length,
    high: forecasts.filter(f => f.urgency === 'high').length,
    total: forecasts.length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-foreground/60">Loading forecasts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-600 font-semibold">CRITICAL</p>
          <p className="text-2xl font-bold text-red-700">{stats.critical}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-xs text-orange-600 font-semibold">HIGH RISK</p>
          <p className="text-2xl font-bold text-orange-700">{stats.high}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-600 font-semibold">TOTAL</p>
          <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('critical')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'critical'
              ? 'bg-primary text-white'
              : 'bg-muted text-foreground hover:bg-border'
          }`}
        >
          Critical & High
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'all'
              ? 'bg-primary text-white'
              : 'bg-muted text-foreground hover:bg-border'
          }`}
        >
          All Items
        </button>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="ml-auto px-3 py-2 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-border transition disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Forecasts List */}
      {filteredForecasts.length === 0 ? (
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-foreground/30 mx-auto mb-2" />
          <p className="text-foreground/60">No forecasts available</p>
          <p className="text-sm text-foreground/40 mt-1">Run a forecast refresh to generate predictions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredForecasts.map(forecast => (
            <StockForecastAlert key={forecast.id} forecast={forecast} />
          ))}
        </div>
      )}
    </div>
  );
}