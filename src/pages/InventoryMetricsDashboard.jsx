import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Package, DollarSign, Activity } from 'lucide-react';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';

export default function InventoryMetricsDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalStockValue: 0,
    totalUnits: 0,
    transactionCount: 0,
    lowStockCount: 0,
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [stockDistribution, setStockDistribution] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [products, stock, transactions] = await Promise.all([
        base44.entities.Product.list(),
        base44.entities.Stock.list(),
        base44.entities.Transaction.list('-created_date', 1000),
      ]);

      // Calculate total stock value
      const totalStockValue = stock.reduce((sum, item) => {
        const product = products.find(p => p.id === item.product_id);
        return sum + (product?.unit_price || 0) * item.quantity;
      }, 0);

      const totalUnits = stock.reduce((sum, s) => sum + s.quantity, 0);
      const lowStockCount = stock.filter(s => s.status === 'low_stock' || s.status === 'out_of_stock').length;

      setMetrics({
        totalStockValue,
        totalUnits,
        transactionCount: transactions.length,
        lowStockCount,
      });

      // Process monthly transaction trends (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const monthlyMap = {};
      transactions
        .filter(tx => new Date(tx.created_date) >= thirtyDaysAgo)
        .forEach(tx => {
          const date = new Date(tx.created_date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
          monthlyMap[date] = (monthlyMap[date] || 0) + 1;
        });

      const monthlyChartData = Object.entries(monthlyMap)
        .map(([date, count]) => ({ date, transactions: count }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      setMonthlyData(monthlyChartData);

      // Get top moving products
      const productSalesMap = {};
      transactions
        .filter(tx => tx.type === 'out')
        .forEach(tx => {
          productSalesMap[tx.product_id] = (productSalesMap[tx.product_id] || 0) + tx.quantity;
        });

      const top10 = Object.entries(productSalesMap)
        .map(([productId, quantity]) => {
          const product = products.find(p => p.id === productId);
          return {
            id: productId,
            name: product?.name || 'Unknown',
            quantity,
            value: (product?.unit_price || 0) * quantity,
          };
        })
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      setTopProducts(top10);

      // Stock distribution by category
      const categoryMap = {};
      products.forEach(product => {
        const category = product.category || 'Uncategorized';
        const productStock = stock.find(s => s.product_id === product.id);
        categoryMap[category] = (categoryMap[category] || 0) + (productStock?.quantity || 0);
      });

      const colors = ['#1e5a2f', '#2d7d3d', '#3ca050', '#4ec563', '#5fcb76'];
      const distribution = Object.entries(categoryMap)
        .map(([category, quantity], idx) => ({
          name: category,
          value: quantity,
          color: colors[idx % colors.length],
        }))
        .sort((a, b) => b.value - a.value);

      setStockDistribution(distribution);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const KPICard = ({ icon: Icon, label, value, unit, highlight }) => (
    <div className={`p-4 rounded-lg border ${highlight ? 'bg-accent/10 border-accent' : 'bg-card border-border'}`}>
      <div className="flex items-start justify-between mb-2">
        <Icon className={`w-6 h-6 ${highlight ? 'text-accent' : 'text-primary'}`} />
      </div>
      <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-foreground">
        {typeof value === 'number' ? value.toLocaleString() : value}
        <span className="text-lg font-normal text-foreground/60 ml-2">{unit}</span>
      </p>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-foreground/60">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <OfflineSyncBanner />

      {/* Header */}
      <div className="bg-primary text-white p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-xl">←</button>
            <h1 className="text-2xl font-bold">Inventory Metrics</h1>
          </div>
          <button
            onClick={loadDashboardData}
            className="bg-primary-light hover:opacity-90 text-white p-2 rounded-lg transition"
          >
            ↻
          </button>
        </div>
        <p className="text-sm text-primary-light ml-12">Stock value, trends & top products</p>
      </div>

      {/* KPI Cards */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <KPICard
            icon={DollarSign}
            label="Total Stock Value"
            value={`₵${(metrics.totalStockValue / 1000).toFixed(1)}`}
            unit="K"
          />
          <KPICard
            icon={Package}
            label="Total Units"
            value={metrics.totalUnits}
            unit="units"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <KPICard
            icon={Activity}
            label="Transactions"
            value={metrics.transactionCount}
            unit=""
          />
          <KPICard
            icon={TrendingUp}
            label="Low Stock Items"
            value={metrics.lowStockCount}
            unit=""
            highlight={metrics.lowStockCount > 0}
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="p-4 space-y-6">
        {/* Monthly Transaction Trends */}
        {monthlyData.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-4">Monthly Transaction Volume (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} />
                <Line type="monotone" dataKey="transactions" stroke="var(--primary)" strokeWidth={2} dot={{ fill: 'var(--primary)', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Moving Products */}
        {topProducts.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-4">Top Moving Products</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} />
                <Bar dataKey="quantity" fill="var(--accent)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Stock Distribution by Category */}
        {stockDistribution.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-4">Stock Distribution by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stockDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stockDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {stockDistribution.map(cat => (
                <div key={cat.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: cat.color }}></div>
                    <span className="text-foreground/80">{cat.name}</span>
                  </div>
                  <span className="font-semibold">{cat.value} units</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}