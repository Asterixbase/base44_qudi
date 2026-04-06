import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import AdminRevenueChart from '@/components/AdminRevenueChart';
import AdminTopProducts from '@/components/AdminTopProducts';
import AdminStockTurnover from '@/components/AdminStockTurnover';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';
import { RefreshCw } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [stockMetrics, setStockMetrics] = useState({
    totalUnitsSold: 0,
    avgStockLevel: 0,
    turnoverRatio: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [transactions, products, stock] = await Promise.all([
        base44.entities.Transaction.list('-created_date', 500),
        base44.entities.Product.list(),
        base44.entities.Stock.list(),
      ]);

      // Process daily revenue data (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const revenueMap = {};
      transactions
        .filter(tx => {
          const txDate = new Date(tx.created_date);
          return tx.type === 'out' && txDate >= thirtyDaysAgo;
        })
        .forEach(tx => {
          const date = new Date(tx.created_date).toLocaleDateString('en-GB');
          const product = products.find(p => p.id === tx.product_id);
          const amount = (product?.unit_price || 0) * tx.quantity;
          revenueMap[date] = (revenueMap[date] || 0) + amount;
        });

      const revenueChartData = Object.entries(revenueMap)
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      setRevenueData(revenueChartData);

      // Process top products
      const productSalesMap = {};
      transactions
        .filter(tx => {
          const txDate = new Date(tx.created_date);
          return tx.type === 'out' && txDate >= thirtyDaysAgo;
        })
        .forEach(tx => {
          productSalesMap[tx.product_id] = (productSalesMap[tx.product_id] || 0) + tx.quantity;
        });

      const topProductsList = Object.entries(productSalesMap)
        .map(([productId, quantity]) => {
          const product = products.find(p => p.id === productId);
          return {
            id: productId,
            name: product?.name || 'Unknown',
            quantity,
          };
        })
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      setTopProducts(topProductsList);

      // Calculate stock turnover metrics
      const totalUnitsSold = Object.values(productSalesMap).reduce((sum, qty) => sum + qty, 0);
      const avgStockLevel = stock.length > 0 
        ? stock.reduce((sum, s) => sum + s.quantity, 0) / stock.length 
        : 0;
      const turnoverRatio = avgStockLevel > 0 ? totalUnitsSold / avgStockLevel : 0;

      setStockMetrics({
        totalUnitsSold,
        avgStockLevel,
        turnoverRatio,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
          <button
            onClick={loadDashboardData}
            className="bg-primary-light hover:bg-primary text-white p-2 rounded-lg transition"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-primary-light ml-12">Revenue, products & inventory insights</p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        <AdminRevenueChart data={revenueData} />
        <AdminTopProducts data={topProducts} />
        <AdminStockTurnover metrics={stockMetrics} />
      </div>
    </div>
  );
}