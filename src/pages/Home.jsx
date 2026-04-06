import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';

export default function Home() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    revenue: 284.50,
    revenueChange: 12,
    itemsSold: 47,
    itemsChange: 8,
    lowStockAlerts: 6,
    totalSkus: 142,
    skusChange: 3,
  });
  const [alerts, setAlerts] = useState([
    { id: 1, name: 'Indomie 70g', type: 'OUT_OF_STOCK', qty: 0, days: 9, order: 120, color: 'red' },
    { id: 2, name: 'Sachet Water Voltic', type: 'LOW_STOCK', qty: 2, days: 1, order: 10, color: 'amber' },
    { id: 3, name: 'Kofi Mensah', type: 'MOMO_REQUEST', amount: 85, color: 'green' },
  ]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <OfflineSyncBanner />
      
      {/* Header */}
      <div className="bg-primary text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Sikasem</h1>
            <p className="text-sm text-primary-light">Ama's Provision Store</p>
          </div>
          <div className="bg-primary-light rounded-full w-8 h-8 flex items-center justify-center text-white font-bold">AA</div>
        </div>
      </div>

      {/* Today's Revenue */}
      <div className="p-4">
        <div className="bg-primary text-white rounded-xl p-4 space-y-3">
          <p className="text-sm text-primary-light">Today's revenue</p>
          <p className="text-4xl font-bold">GHS {stats.revenue.toFixed(2)}</p>
          <div className="flex gap-4 text-sm">
            <span>↑ {stats.revenueChange}% vs yesterday</span>
            <span>Cash GHS 192.00</span>
            <span>MoMo GHS 92.50</span>
          </div>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="px-4 grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-4 border border-border">
          <p className="text-3xl font-bold text-foreground">{stats.itemsSold}</p>
          <p className="text-sm text-foreground/60">Items sold today</p>
          <p className="text-xs text-green-600">↑ {stats.itemsChange} vs yesterday</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-border">
          <p className="text-3xl font-bold text-destructive">{stats.lowStockAlerts}</p>
          <p className="text-sm text-foreground/60">Low stock alerts</p>
          <button onClick={() => navigate('/low-stock')} className="text-xs text-primary hover:underline">Tap to review</button>
        </div>
        <div className="bg-white rounded-lg p-4 border border-border">
          <p className="text-3xl font-bold text-foreground">31%</p>
          <p className="text-sm text-foreground/60">Avg profit margin</p>
          <p className="text-xs text-foreground/50">Top 10 details</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-border">
          <p className="text-3xl font-bold text-foreground">{stats.totalSkus}</p>
          <p className="text-sm text-foreground/60">Total SKUs</p>
          <p className="text-xs text-green-600">+{stats.skusChange} this week</p>
        </div>
      </div>

      {/* Urgent Alerts */}
      <div className="p-4 space-y-3">
        <h2 className="font-semibold text-foreground">Urgent alerts</h2>
        {alerts.map(alert => (
          <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${
            alert.color === 'red' ? 'bg-red-50 border-red-400' :
            alert.color === 'amber' ? 'bg-amber-50 border-amber-400' :
            'bg-green-50 border-green-400'
          }`}>
            <p className="font-semibold text-foreground">{alert.name}</p>
            <p className="text-xs text-foreground/60">
              {alert.type === 'OUT_OF_STOCK' && `${alert.qty} pcs · ${alert.days}2day avg · Order ${alert.order} pcs`}
              {alert.type === 'LOW_STOCK' && `${alert.qty} bags · ${alert.days} day of stock · Suggest ${alert.order} bags`}
              {alert.type === 'MOMO_REQUEST' && `MoMo request sent · awaiting approval`}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="p-4 space-y-3">
        <h2 className="font-semibold text-foreground">Quick actions</h2>
        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => navigate('/scan')} className="flex flex-col items-center gap-2 p-3 bg-primary text-white rounded-lg font-medium">
            📷 Scan
          </button>
          <button onClick={() => navigate('/sale')} className="flex flex-col items-center gap-2 p-3 bg-muted text-foreground rounded-lg font-medium">
            💰 Sell
          </button>
          <button onClick={() => navigate('/tax')} className="flex flex-col items-center gap-2 p-3 bg-muted text-foreground rounded-lg font-medium">
            📋 Tax
          </button>
          <button onClick={() => navigate('/credit')} className="flex flex-col items-center gap-2 p-3 bg-muted text-foreground rounded-lg font-medium">
            💳 Credit
          </button>
        </div>
      </div>
    </div>
  );
}