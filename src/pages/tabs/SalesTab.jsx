import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, TrendingUp, AlertCircle, Plus } from 'lucide-react';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';

export default function SalesTab() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    todayRevenue: 0,
    itemsSold: 0,
    lowStockCount: 0,
    totalSkus: 0,
  });
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [transactions, products, stock] = await Promise.all([
        base44.entities.Transaction.filter({ type: 'out' }, '-created_date', 100),
        base44.entities.Product.list(),
        base44.entities.Stock.list(),
      ]);

      const today = new Date().toDateString();
      const todayTxns = transactions.filter(t => new Date(t.created_date).toDateString() === today);
      const todayRevenue = todayTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
      const itemsSold = todayTxns.reduce((sum, t) => sum + (t.quantity || 0), 0);
      const lowStockItems = stock.filter(s => s.status === 'low_stock').length;

      const criticalAlerts = stock.filter(s => s.status === 'out_of_stock').slice(0, 3);

      setStats({
        todayRevenue,
        itemsSold,
        lowStockCount: lowStockItems,
        totalSkus: products.length,
      });
      setAlerts(criticalAlerts);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <OfflineSyncBanner />

      {/* Header */}
      <div className="bg-primary text-white p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">Sikasem</h1>
          <div className="text-xs text-primary-light">Ama's Provision Store</div>
        </div>
        <div className="text-sm text-primary-light">Today's revenue</div>
      </div>

      {/* Revenue Card */}
      <div className="bg-primary text-white p-4 m-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <div className="text-4xl font-bold">GHS {stats.todayRevenue.toFixed(2)}</div>
          <div className="text-xs text-primary-light">↑ 12% vs yesterday</div>
        </div>
        <div className="text-xs text-primary-light space-y-1">
          <p>Cash GHS 192.00 · MoMo GHS 92.50</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 px-4 mb-4">
        <StatBox label="Items sold today" value={stats.itemsSold} icon="📦" />
        <StatBox label="Low stock alerts" value={stats.lowStockCount} icon="⚠️" highlight={stats.lowStockCount > 0} />
        <StatBox label="Avg profit margin" value="31%" icon="📈" />
        <StatBox label="Total SKUs" value={stats.totalSkus} icon="🏷️" />
      </div>

      {/* Urgent Alerts */}
      <div className="px-4 mb-4">
        <h2 className="text-sm font-semibold text-foreground/70 mb-2">Urgent alerts</h2>
        {alerts.length > 0 ? (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.id} className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                <p className="font-semibold text-foreground">{alert.product_name}</p>
                <p className="text-xs text-foreground/70">OUT OF STOCK • Order {alert.reorder_level} pcs</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-foreground/60">No urgent alerts</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-4 space-y-2">
        <h2 className="text-sm font-semibold text-foreground/70">Quick actions</h2>
        <div className="grid grid-cols-4 gap-2">
          <ActionButton label="Scan" icon="📱" onClick={() => navigate('/stock')} />
          <ActionButton label="Sell" icon="🛒" onClick={() => navigate('/home/sale')} />
          <ActionButton label="Tax" icon="📋" onClick={() => navigate('/tax')} />
          <ActionButton label="Credit" icon="💳" onClick={() => navigate('/credit')} />
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, icon, highlight }) {
  return (
    <div className={`p-3 rounded-lg border ${highlight ? 'bg-destructive/10 border-destructive/30' : 'bg-card border-border'}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-xs text-foreground/60">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function ActionButton({ label, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 py-2 px-2 rounded-lg bg-primary text-white hover:bg-primary-light transition text-xs font-medium"
    >
      <span className="text-xl">{icon}</span>
      {label}
    </button>
  );
}