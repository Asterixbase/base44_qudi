import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import StockByCategoryChart from '@/sikasem/components/StockByCategoryChart';
import TransactionTrendsChart from '@/sikasem/components/TransactionTrendsChart';
import OfflineSyncBanner from '@/sikasem/components/OfflineSyncBanner';

export default function InventoryDashboard() {
  const navigate = useNavigate();
  const [stockData, setStockData] = useState([]);
  const [transactionData, setTransactionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalProducts: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [products, stock, transactions] = await Promise.all([
        base44.entities.Product.list(),
        base44.entities.Stock.list(),
        base44.entities.Transaction.list(),
      ]);

      // Process stock by category
      const categoryMap = {};
      stock.forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        const category = product?.category || 'Uncategorized';
        if (!categoryMap[category]) {
          categoryMap[category] = { category, inStock: 0, outOfStock: 0, lowStock: 0 };
        }
        if (item.status === 'out_of_stock') categoryMap[category].outOfStock += item.quantity;
        else if (item.status === 'low_stock') categoryMap[category].lowStock += item.quantity;
        else categoryMap[category].inStock += item.quantity;
      });

      setStockData(Object.values(categoryMap));

      // Process transaction trends (last 30 days)
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);
      const dailyMap = {};

      transactions
        .filter(tx => new Date(tx.created_date) >= last30Days)
        .forEach(tx => {
          const date = new Date(tx.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (!dailyMap[date]) dailyMap[date] = { date, inbound: 0, outbound: 0 };
          if (tx.type === 'in') dailyMap[date].inbound += tx.quantity;
          if (tx.type === 'out') dailyMap[date].outbound += tx.quantity;
        });

      setTransactionData(Object.values(dailyMap).sort((a, b) => new Date(a.date) - new Date(b.date)));

      // Calculate summary
      setSummary({
        totalProducts: products.length,
        lowStock: stock.filter(s => s.status === 'low_stock').length,
        outOfStock: stock.filter(s => s.status === 'out_of_stock').length,
        totalValue: products.reduce((sum, p) => sum + (p.unit_price * (stock.find(s => s.product_id === p.id)?.quantity || 0)), 0),
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <OfflineSyncBanner />

      {/* Header */}
      <div className="bg-primary text-white p-4 sticky top-0 z-40">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="text-xl">←</button>
          <h1 className="text-2xl font-bold">Inventory Dashboard</h1>
        </div>
        <p className="text-sm text-primary-light ml-12">Real-time stock & transaction overview</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-foreground/60">Loading dashboard...</p>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <SummaryCard label="Total Products" value={summary.totalProducts} icon="📦" />
            <SummaryCard label="Low Stock" value={summary.lowStock} icon="⚠️" highlight={summary.lowStock > 0} />
            <SummaryCard label="Out of Stock" value={summary.outOfStock} icon="❌" highlight={summary.outOfStock > 0} />
            <SummaryCard label="Total Value" value={`GHS ${summary.totalValue.toLocaleString()}`} icon="💰" />
          </div>

          {/* Charts */}
          <div className="space-y-6">
            {stockData.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h2 className="text-lg font-bold mb-4 text-foreground">Stock Levels by Category</h2>
                <StockByCategoryChart data={stockData} />
              </div>
            )}

            {transactionData.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h2 className="text-lg font-bold mb-4 text-foreground">Transaction Trends (30 Days)</h2>
                <TransactionTrendsChart data={transactionData} />
              </div>
            )}
          </div>

          {/* Empty State */}
          {stockData.length === 0 && transactionData.length === 0 && (
            <div className="text-center py-12">
              <p className="text-2xl mb-2">📊</p>
              <p className="text-foreground/60">No data available yet</p>
              <p className="text-sm text-foreground/40 mt-2">Start tracking stock to see analytics</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, highlight }) {
  return (
    <div className={`p-4 rounded-lg border ${highlight ? 'bg-destructive/10 border-destructive/30' : 'bg-card border-border'}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <p className="text-xs text-foreground/60 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-foreground mt-1">{value}</p>
    </div>
  );
}