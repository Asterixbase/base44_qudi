import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { offlineSync } from '@/lib/offlineSync';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';
import LowStockWidget from '@/components/LowStockWidget';

export default function Dashboard() {
  const navigate = useNavigate();
  const { performSync } = useOfflineSync();
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    outOfStock: 0,
    pendingSync: 0,
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    loadStats();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadStats = async () => {
    try {
      const products = await base44.entities.Product.list();
      const stock = await base44.entities.Stock.list();
      const queue = offlineSync.getQueue();

      const lowStock = stock.filter(s => s.status === 'low_stock').length;
      const outOfStock = stock.filter(s => s.status === 'out_of_stock').length;

      setStats({
        totalProducts: products.length,
        lowStock,
        outOfStock,
        pendingSync: queue.filter(q => !q.synced).length,
      });

      offlineSync.cacheProducts(products);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleSync = async () => {
    await performSync();
    loadStats();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Offline Sync Banner */}
      <OfflineSyncBanner />

      {/* Header */}
      <div className="bg-primary text-white p-4 sticky top-0 z-40">
        <h1 className="text-2xl font-bold">Sikasem</h1>
        <p className="text-sm text-primary-light opacity-80">{isOnline ? '🟢 Online' : '🔴 Offline'}</p>
      </div>

      {/* Sync Alert */}
      {stats.pendingSync > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 m-4">
          <p className="text-sm font-semibold text-yellow-800">
            {stats.pendingSync} pending sync
          </p>
          {isOnline && (
            <button
              onClick={handleSync}
              className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded-md text-sm font-medium hover:bg-yellow-700"
            >
              Sync Now
            </button>
          )}
        </div>
      )}

      {/* Low Stock Alert Widget */}
      <div className="px-4 pt-2">
        <LowStockWidget />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 p-4">
        <StatCard
          label="Total Products"
          value={stats.totalProducts}
          icon="📦"
          onClick={() => navigate('/stock')}
        />
        <StatCard
          label="Low Stock"
          value={stats.lowStock}
          icon="⚠️"
          highlight={stats.lowStock > 0}
          onClick={() => navigate('/stock')}
        />
        <StatCard
          label="Out of Stock"
          value={stats.outOfStock}
          icon="❌"
          highlight={stats.outOfStock > 0}
          onClick={() => navigate('/stock')}
        />
        <StatCard
          label="Pending Sync"
          value={stats.pendingSync}
          icon="🔄"
          highlight={stats.pendingSync > 0}
        />
      </div>

      {/* Quick Actions */}
      <div className="p-4 space-y-2">
        <h2 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">Quick Actions</h2>
        <QuickActionButton label="Scan Barcode" icon="📱" onClick={() => navigate('/scan')} />
        <QuickActionButton label="Check Stock" icon="📊" onClick={() => navigate('/stock')} />
        <QuickActionButton label="AI Predictions" icon="🤖" onClick={() => navigate('/predictions')} />
        <QuickActionButton label="Reports" icon="📈" onClick={() => navigate('/reports')} />
        <QuickActionButton label="Settings" icon="⚙️" onClick={() => navigate('/settings')} />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, highlight, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg cursor-pointer transition ${
        highlight
          ? 'bg-destructive/10 border border-destructive/30'
          : 'bg-card border border-border'
      }`}
    >
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-xs text-foreground/60 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function QuickActionButton({ label, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-primary text-white font-medium py-3 rounded-lg flex items-center gap-3 hover:bg-primary-light transition"
    >
      <span className="text-xl">{icon}</span>
      {label}
    </button>
  );
}