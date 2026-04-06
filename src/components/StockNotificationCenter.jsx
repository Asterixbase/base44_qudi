import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2, Check, AlertCircle } from 'lucide-react';

export default function StockNotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unread');

  useEffect(() => {
    loadNotifications();
    const unsubscribe = base44.entities.StockNotification.subscribe((event) => {
      if (event.type === 'create') {
        setNotifications((prev) => [event.data, ...prev]);
      } else if (event.type === 'update') {
        setNotifications((prev) =>
          prev.map((n) => (n.id === event.id ? event.data : n))
        );
      } else if (event.type === 'delete') {
        setNotifications((prev) => prev.filter((n) => n.id !== event.id));
      }
    });
    return unsubscribe;
  }, []);

  const loadNotifications = async () => {
    try {
      const allNotifications = await base44.entities.StockNotification.list('-created_date', 100);
      setNotifications(allNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id, currentRead) => {
    await base44.entities.StockNotification.update(id, { read: !currentRead });
  };

  const handleMarkAction = async (id) => {
    await base44.entities.StockNotification.update(id, { action_taken: true });
  };

  const handleDelete = async (id) => {
    await base44.entities.StockNotification.delete(id);
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'expired') return n.type === 'expired';
    if (filter === 'low_stock') return n.type === 'low_stock';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const expiredCount = notifications.filter((n) => n.type === 'expired' && !n.action_taken).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alert Banner */}
      {(unreadCount > 0 || expiredCount > 0) && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <div>
            <p className="font-semibold text-destructive">
              {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}
              {expiredCount > 0 && ` • ${expiredCount} expired item${expiredCount !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border">
        {[
          { value: 'all', label: 'All' },
          { value: 'unread', label: `Unread (${unreadCount})` },
          { value: 'low_stock', label: 'Low Stock' },
          { value: 'expired', label: 'Expired' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-1 transition ${
              filter === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-foreground/60 hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-foreground/60">No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notification) => (
            <div
              key={notification.id}
              className={`border rounded-lg p-4 transition ${
                notification.read
                  ? 'border-border bg-card'
                  : 'border-primary/30 bg-primary/5'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${
                        notification.type === 'expired'
                          ? 'bg-destructive/20 text-destructive'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {notification.type === 'expired' ? 'EXPIRED' : 'LOW STOCK'}
                    </span>
                    {!notification.read && (
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                    )}
                  </div>

                  <h4 className="font-semibold text-foreground">
                    {notification.product_name}{' '}
                    <span className="text-sm text-foreground/60">
                      ({notification.product_sku})
                    </span>
                  </h4>

                  {notification.type === 'low_stock' && (
                    <p className="text-sm text-foreground/70 mt-1">
                      Current: {notification.current_quantity} units • Reorder level: {notification.reorder_level}
                    </p>
                  )}
                  {notification.type === 'expired' && (
                    <p className="text-sm text-foreground/70 mt-1">
                      Expired: {new Date(notification.expiry_date).toLocaleDateString()}
                    </p>
                  )}

                  {notification.location && (
                    <p className="text-xs text-foreground/50 mt-1">
                      Location: {notification.location}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleMarkAction(notification.id)}
                    disabled={notification.action_taken}
                    className="p-2 rounded hover:bg-primary/10 transition disabled:opacity-50"
                    title="Mark as actioned"
                  >
                    <Check className="w-4 h-4 text-primary" />
                  </button>
                  <button
                    onClick={() => handleMarkRead(notification.id, notification.read)}
                    className="p-2 rounded hover:bg-muted transition"
                    title={notification.read ? 'Mark as unread' : 'Mark as read'}
                  >
                    {notification.read ? '👁' : '📭'}
                  </button>
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="p-2 rounded hover:bg-destructive/10 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>

              {notification.action_taken && (
                <p className="text-xs text-green-600 mt-2 font-medium">✓ Action completed</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}