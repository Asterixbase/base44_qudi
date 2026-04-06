import { useNavigate } from 'react-router-dom';
import StockNotificationCenter from '@/components/StockNotificationCenter';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';

export default function StockNotifications() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Offline Sync Banner */}
      <OfflineSyncBanner />

      {/* Header */}
      <div className="bg-primary text-white p-4 sticky top-0 z-40">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="text-xl">←</button>
          <h1 className="text-2xl font-bold">Stock Notifications</h1>
        </div>
        <p className="text-sm text-primary-light ml-12">Low stock alerts & expiry warnings</p>
      </div>

      {/* Notifications */}
      <div className="p-4">
        <StockNotificationCenter />
      </div>
    </div>
  );
}