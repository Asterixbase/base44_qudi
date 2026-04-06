import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import AdminRevenueChart from '@/components/AdminRevenueChart';
import AdminTopProducts from '@/components/AdminTopProducts';
import AdminStockTurnover from '@/components/AdminStockTurnover';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';
import { RefreshCw, Download } from 'lucide-react';

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

  const exportData = async (type) => {
    try {
      const functionName = type === 'transactions' ? 'exportTransactions' : 'exportInventory';
      const response = await fetch(`/api/functions/${functionName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const loadDashboardData = async () => {

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

      {/* Export Controls */}
      <div className="px-4 pt-4 pb-0">
        <div className="flex gap-2">
          <button
            onClick={() => exportData('transactions')}
            className="flex-1 bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary-light transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Transactions
          </button>
          <button
            onClick={() => exportData('inventory')}
            className="flex-1 bg-accent text-white py-2 rounded-lg font-medium hover:bg-accent-light transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Inventory
          </button>
        </div>
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

export default AdminDashboard;
}