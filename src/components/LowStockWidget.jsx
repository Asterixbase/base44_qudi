import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function LowStockWidget() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLowStockNotifications();
  }, []);

  const loadLowStockNotifications = async () => {
    try {
      setLoading(true);
      // Fetch unread/recent low stock notifications
      const recentNotifications = await base44.entities.StockNotification.filter({
        type: 'low_stock',
      }, '-created_date', 10);

      setNotifications(recentNotifications || []);
    } catch (error) {
      console.error('Failed to load low stock notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await base44.entities.StockNotification.update(notificationId, {
        read: true,
      });
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  if (!notifications || notifications.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-green-600" />
          <h2 className="font-semibold text-foreground">Stock Status</h2>
        </div>
        <p className="text-sm text-foreground/60">All products are above reorder threshold</p>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h2 className="font-semibold text-amber-900">
            {notifications.length} Product{notifications.length !== 1 ? 's' : ''} Low on Stock
          </h2>
        </div>
        <button
          onClick={loadLowStockNotifications}
          disabled={loading}
          className="p-1 hover:bg-amber-100 rounded-lg transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-amber-700 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {notifications.slice(0, 5).map(notification => (
          <div
            key={notification.id}
            className="bg-white rounded p-3 border border-amber-200 flex items-start justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground truncate">
                {notification.product_name}
              </p>
              <p className="text-xs text-foreground/60 mt-1">
                {notification.current_quantity} / {notification.reorder_level} units
              </p>
              {notification.location && (
                <p className="text-xs text-foreground/50 mt-1">
                  📍 {notification.location}
                </p>
              )}
            </div>
            <button
              onClick={() => markAsRead(notification.id)}
              className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium rounded transition whitespace-nowrap"
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>

      {notifications.length > 5 && (
        <p className="text-xs text-amber-700 mt-3 text-center">
          +{notifications.length - 5} more items
        </p>
      )}

      {/* CTA */}
      <a
        href="/purchase-orders"
        className="block mt-4 text-center bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-lg font-medium text-sm transition"
      >
        Create Purchase Orders
      </a>
    </div>
  );
}