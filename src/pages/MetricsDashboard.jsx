import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import DailyTransactionChart from '@/components/DailyTransactionChart';
import TopProductsChart from '@/components/TopProductsChart';
import StockDepletionChart from '@/components/StockDepletionChart';
import StockPredictionDashboard from '@/components/StockPredictionDashboard';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';

export default function MetricsDashboard() {
  const navigate = useNavigate();
  const [dailyData, setDailyData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [depletionData, setDepletionData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const [transactions, products, stock] = await Promise.all([
        base44.entities.Transaction.list(),
        base44.entities.Product.list(),
        base44.entities.Stock.list(),
      ]);

      // Aggregate daily transactions
      const dailyMap = {};
      transactions.forEach(tx => {
        const date = new Date(tx.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dailyMap[date] = (dailyMap[date] || 0) + 1;
      });
      setDailyData(
        Object.entries(dailyMap).map(([date, count]) => ({
          date,
          transactions: count,
        }))
      );

      // Top products by outbound transactions
      const outboundTx = transactions.filter(tx => tx.type === 'out');
      const productSales = {};
      outboundTx.forEach(tx => {
        productSales[tx.product_name] = (productSales[tx.product_name] || 0) + tx.quantity;
      });
      const sortedProducts = Object.entries(productSales)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([name, quantity]) => ({ name, quantity }));
      setTopProducts(sortedProducts);

      // Stock depletion rate over time
      const depletionMap = {};
      stock.forEach(item => {
        const status = item.status;
        const depletionRate = 
          status === 'out_of_stock' ? 100 :
          status === 'low_stock' ? 60 :
          status === 'expired' ? 100 :
          0;
        
        const date = new Date(item.last_counted).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const rates = depletionMap[date] || [];
        rates.push(depletionRate);
        depletionMap[date] = rates;
      });
      
      setDepletionData(
        Object.entries(depletionMap)
          .map(([date, rates]) => ({
            date,
            depletionRate: rates.reduce((a, b) => a + b, 0) / rates.length,
          }))
          .slice(0, 30)
      );
    } catch (error) {
      console.error('Failed to load metrics:', error);
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
          <h1 className="text-2xl font-bold">Metrics Dashboard</h1>
        </div>
        <p className="text-sm text-primary-light ml-12">Real-time analytics & insights</p>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-foreground/60">Loading metrics...</p>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-6">
          {/* Predictive Analytics */}
          <div>
            <h2 className="text-lg font-bold mb-4 text-foreground">Stock Predictions</h2>
            <StockPredictionDashboard />
          </div>

          {/* Charts Grid */}
          <div className="space-y-6">
            {dailyData.length > 0 && <DailyTransactionChart data={dailyData} />}
            
            {topProducts.length > 0 && <TopProductsChart data={topProducts} />}
            
            {depletionData.length > 0 && <StockDepletionChart data={depletionData} />}
          </div>

          {/* Empty State */}
          {dailyData.length === 0 && topProducts.length === 0 && depletionData.length === 0 && (
            <div className="text-center py-12">
              <p className="text-2xl mb-2">📊</p>
              <p className="text-foreground/60">No data available yet</p>
              <p className="text-sm text-foreground/40 mt-2">Start tracking transactions to see metrics</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}