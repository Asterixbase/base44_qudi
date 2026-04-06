import { useEffect, useRef } from 'react';
import { useOfflineStore } from '@/lib/stores/offlineStore';
import { base44 } from '@/api/base44Client';

export function useOfflineSync() {
  const {
    queue,
    syncStatus,
    setSyncStatus,
    setError,
    updateLastSyncTime,
    markSynced,
    clearSynced,
  } = useOfflineStore();

  const syncTimeoutRef = useRef(null);
  const isOnlineRef = useRef(navigator.onLine);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      console.log('[Offline Sync] Network restored');
      // Trigger sync after network is restored
      syncTimeoutRef.current = setTimeout(() => {
        performSync();
      }, 500);
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
      console.log('[Offline Sync] Network lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Sync transactions to server
  const performSync = async () => {
    if (syncStatus === 'syncing' || !isOnlineRef.current) return;

    const pendingItems = queue.filter((item) => !item.synced);
    if (pendingItems.length === 0) return;

    setSyncStatus('syncing');
    setError(null);

    try {
      for (const item of pendingItems) {
        try {
          // Create transaction on server
          await base44.entities.Transaction.create({
            product_id: item.product_id,
            product_name: item.product_name,
            type: item.type,
            quantity: item.quantity,
            reference: item.reference,
            notes: item.notes || `Synced from offline queue`,
            sync_status: 'synced',
          });

          // Mark as synced locally
          markSynced(item.id);
        } catch (error) {
          console.error(`Failed to sync transaction ${item.id}:`, error);
          throw error;
        }
      }

      // Clean up synced items
      clearSynced();
      updateLastSyncTime();
      setSyncStatus('idle');
      console.log('[Offline Sync] All transactions synced successfully');
    } catch (error) {
      setSyncStatus('error');
      setError(error.message || 'Sync failed');
      console.error('[Offline Sync] Error:', error);
    }
  };

  return {
    queue,
    pendingCount: queue.filter((item) => !item.synced).length,
    syncStatus,
    isOnline: isOnlineRef.current,
    lastSyncTime: useOfflineStore((state) => state.lastSyncTime),
    performSync,
  };
}