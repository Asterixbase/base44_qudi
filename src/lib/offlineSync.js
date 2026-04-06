/**
 * Offline sync management for Sikasem
 * Queues transactions locally, syncs when online
 */

const SYNC_QUEUE_KEY = 'sikasem_sync_queue';
const OFFLINE_PRODUCTS_KEY = 'sikasem_products_cache';

export const offlineSync = {
  /**
   * Add transaction to offline queue
   */
  queueTransaction(transaction) {
    const queue = this.getQueue();
    const item = {
      ...transaction,
      id: `offline_${Date.now()}_${Math.random()}`,
      synced: false,
      timestamp: new Date().toISOString(),
    };
    queue.push(item);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    return item;
  },

  /**
   * Get all pending transactions
   */
  getQueue() {
    const stored = localStorage.getItem(SYNC_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  /**
   * Clear queue after successful sync
   */
  clearQueue() {
    localStorage.removeItem(SYNC_QUEUE_KEY);
  },

  /**
   * Mark items as synced
   */
  markSynced(ids) {
    const queue = this.getQueue();
    const updated = queue.map(item =>
      ids.includes(item.id) ? { ...item, synced: true } : item
    );
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updated));
  },

  /**
   * Cache products for offline access
   */
  cacheProducts(products) {
    localStorage.setItem(OFFLINE_PRODUCTS_KEY, JSON.stringify(products));
  },

  /**
   * Get cached products
   */
  getCachedProducts() {
    const stored = localStorage.getItem(OFFLINE_PRODUCTS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  /**
   * Check if online
   */
  isOnline() {
    return navigator.onLine;
  },
};