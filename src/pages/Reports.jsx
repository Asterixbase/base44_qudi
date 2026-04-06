import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function Reports() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalValue: 0,
    transactions: 0,
    avgStockPerProduct: 0,
    topProducts: [],
  });
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    loadReports();
  }, [period]);

  const loadReports = async () => {
    try {
      const products = await base44.entities.Product.list();
      const stock = await base44.entities.Stock.list();
      const transactions = await base44.entities.Transaction.list();

      const totalValue = products.reduce((sum, p) => {
        const s = stock.find(st => st.product_id === p.id);
        return sum + (s ? s.quantity * (p.unit_price || 0) : 0);
      }, 0);

      const topProducts = stock
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      const avgStock = stock.length > 0
        ? stock.reduce((sum, s) => sum + s.quantity, 0) / stock.length
        : 0;

      setStats({
        totalValue,
        transactions: transactions.length,
        avgStockPerProduct: avgStock.toFixed(2),
        topProducts,
      });
    } catch (error) {
      console.error('Failed to load reports:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-white p-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="text-xl">←</button>
          <h1 className="text-xl font-bold">Reports & Analytics</h1>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {['week', 'month', 'year'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                period === p ? 'bg-white text-primary' : 'bg-primary-light'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 p-4">
        <KPICard
          label="Total Stock Value"
          value={`₵${stats.totalValue.toFixed(2)}`}
          icon="💰"
        />
        <KPICard
          label="Transactions"
          value={stats.transactions}
          icon="📊"
        />
        <KPICard
          label="Avg Stock/Product"
          value={parseFloat(stats.avgStockPerProduct).toFixed(0)}
          icon="📦"
        />
        <KPICard
          label="Period"
          value={period.charAt(0).toUpperCase() + period.slice(1)}
          icon="📅"
        />
      </div>

      {/* Top Products */}
      <div className="p-4">
        <h2 className="text-lg font-bold mb-4">Top 5 Products by Quantity</h2>
        <div className="space-y-2">
          {stats.topProducts.length === 0 ? (
            <p className="text-foreground/60 text-center py-8">No data available</p>
          ) : (
            stats.topProducts.map((item, idx) => (
              <div key={item.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl font-bold text-primary/60 w-8">{idx + 1}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{item.product_name}</p>
                    <p className="text-xs text-foreground/60">{item.product_sku}</p>
                  </div>
                  <p className="text-xl font-bold text-primary">{item.quantity}</p>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-full rounded-full transition"
                    style={{
                      width: `${(item.quantity / stats.topProducts[0].quantity) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Export Options */}
      <div className="p-4 space-y-2">
        <h2 className="text-lg font-bold mb-4">Export</h2>
        <button className="w-full bg-card border border-border py-3 rounded-lg font-medium hover:bg-muted transition text-foreground">
          📄 Export as CSV
        </button>
        <button className="w-full bg-card border border-border py-3 rounded-lg font-medium hover:bg-muted transition text-foreground">
          📋 Export as PDF
        </button>
      </div>
    </div>
  );
}

function KPICard({ label, value, icon }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-xs text-foreground/60 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-foreground break-words">{value}</p>
    </div>
  );
}