import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';
import { RefreshCw, TrendingUp, AlertTriangle, Zap } from 'lucide-react';

export default function SikasemDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    outOfStock: 0,
    recentSales: 0,
    revenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
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
      setIsLoading(true);
      const [products, stock, transactions] = await Promise.all([
        base44.entities.Product.list(),
        base44.entities.Stock.list(),
        base44.entities.Transaction.list('-created_date', 100),
      ]);

      const lowStock = stock.filter(s => s.status === 'low_stock').length;
      const outOfStock = stock.filter(s => s.status === 'out_of_stock').length;
      
      const recentSales = transactions.filter(t => t.type === 'out').length;
      const revenue = transactions
        .filter(t => t.type === 'out')
        .reduce((sum, t) => {
          const product = products.find(p => p.id === t.product_id);
          return sum + ((product?.unit_price || 0) * t.quantity);
        }, 0);

      setStats({
        totalProducts: products.length,
        lowStock,
        outOfStock,
        recentSales,
        revenue: (revenue / 100).toFixed(2), // Convert pesawas to GHS
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isOwner = user?.role === 'admin' || user?.role === 'owner';

  return (
    <div className="min-h-screen bg-background pb-24">
      <OfflineSyncBanner />

      {/* Header with Status */}
      <div className="bg-gradient-to-r from-primary to-primary-light text-white p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-3xl font-bold">Sikasem</h1>
            <p className="text-sm text-primary-light/90 flex items-center gap-1 mt-1">
              <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}></span>
              {isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
          <button
            onClick={loadStats}
            disabled={isLoading}
            className="bg-primary-light hover:bg-primary text-white p-3 rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Grid - Fixed with proper flexbox (ISS-001 fix) */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3 auto-rows-max">
          <KPICard 
            label="Total Products"
            value={stats.totalProducts}
            icon="📦"
            onClick={() => navigate('/stock')}
          />
          <KPICard 
            label="Low Stock"
            value={stats.lowStock}
            icon="⚠️"
            highlight={stats.lowStock > 0}
            onClick={() => navigate('/alerts')}
          />
          <KPICard 
            label="Out of Stock"
            value={stats.outOfStock}
            icon="❌"
            highlight={stats.outOfStock > 0}
            onClick={() => navigate('/alerts')}
          />
          <KPICard 
            label="Revenue (GHS)"
            value={stats.revenue}
            icon="💰"
            clickable={false}
          />
        </div>
      </div>

      {/* Critical Alerts Section */}
      {(stats.lowStock > 0 || stats.outOfStock > 0) && (
        <div className="px-4 py-2">
          <div className="bg-destructive/10 border-l-4 border-destructive rounded-lg p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-destructive text-sm">
                {stats.outOfStock > 0 ? `${stats.outOfStock} item${stats.outOfStock !== 1 ? 's' : ''} out of stock` : `${stats.lowStock} item${stats.lowStock !== 1 ? 's' : ''} running low`}
              </p>
              <button
                onClick={() => navigate('/alerts')}
                className="text-xs text-destructive/80 hover:text-destructive font-medium mt-2 underline"
              >
                View alerts →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div className="p-4 space-y-3">
        <h2 className="text-xs font-bold text-foreground/60 uppercase tracking-widest">Quick Actions</h2>
        
        <div className="grid grid-cols-2 gap-2">
          <ActionButton 
            label="Scan Barcode"
            icon="📱"
            onClick={() => navigate('/scan')}
            primary
          />
          <ActionButton 
            label="Check Stock"
            icon="📊"
            onClick={() => navigate('/stock')}
          />
          <ActionButton 
            label="Record Sale"
            icon="💳"
            onClick={() => navigate('/sale')}
            primary
          />
          <ActionButton 
            label="Reports"
            icon="📈"
            onClick={() => navigate('/inventory-metrics')}
          />
        </div>

        {isOwner && (
          <>
            <hr className="border-border my-2" />
            <h2 className="text-xs font-bold text-foreground/60 uppercase tracking-widest">Owner Only</h2>
            <ActionButton 
              label="Treasury"
              icon="🏦"
              onClick={() => navigate('/treasury')}
              highlight
            />
          </>
        )}
      </div>
    </div>
  );
}

function KPICard({ label, value, icon, highlight, onClick, clickable = true }) {
  const baseClass = `p-4 rounded-lg cursor-pointer transition ${
    highlight
      ? 'bg-destructive/10 border-2 border-destructive'
      : 'bg-card border-2 border-border hover:border-primary/30'
  } ${!clickable ? 'cursor-default' : ''}`;

  return (
    <div onClick={onClick} className={baseClass}>
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
    </div>
  );
}

function ActionButton({ label, icon, onClick, primary, highlight }) {
  const baseClass = `w-full py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 border-2`;
  const colorClass = primary
    ? 'bg-primary text-white border-primary hover:bg-primary-light'
    : highlight
    ? 'bg-accent text-white border-accent hover:bg-accent-light'
    : 'bg-card text-foreground border-border hover:border-primary/30';

  return (
    <button onClick={onClick} className={`${baseClass} ${colorClass}`}>
      <span className="text-xl">{icon}</span>
      <span className="text-sm">{label}</span>
    </button>
  );
}