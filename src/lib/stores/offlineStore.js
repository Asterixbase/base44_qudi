import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useOfflineStore = create(
  persist(
    (set, get) => ({
      queue: [],
      syncStatus: 'idle', // idle, syncing, error
      lastSyncTime: null,
      error: null,

      // Add transaction to queue
      queueTransaction: (transaction) => {
        set((state) => ({
          queue: [
            ...state.queue,
            {
              ...transaction,
              id: `${Date.now()}-${Math.random()}`,
              queuedAt: new Date().toISOString(),
              synced: false,
            },
          ],
        }));
      },

      // Bulk add to queue
      queueBatch: (transactions) => {
        set((state) => ({
          queue: [
            ...state.queue,
            ...transactions.map((t) => ({
              ...t,
              id: `${Date.now()}-${Math.random()}`,
              queuedAt: new Date().toISOString(),
              synced: false,
            })),
          ],
        }));
      },

      // Mark transaction as synced
      markSynced: (id) => {
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id ? { ...item, synced: true } : item
          ),
        }));
      },

      // Remove synced items from queue
      clearSynced: () => {
        set((state) => ({
          queue: state.queue.filter((item) => !item.synced),
        }));
      },

      // Clear entire queue
      clearQueue: () => {
        set({ queue: [], error: null });
      },

      // Set sync status
      setSyncStatus: (status) => set({ syncStatus: status }),

      // Set error message
      setError: (error) => set({ error }),

      // Update last sync time
      updateLastSyncTime: () => set({ lastSyncTime: new Date().toISOString() }),

      // Get pending count
      getPendingCount: () => {
        return get().queue.filter((item) => !item.synced).length;
      },

      // Get queue
      getQueue: () => get().queue,
    }),
    {
      name: 'sikasem-offline-queue',
      storage: createJSONStorage(() => localStorage),
    }
  )
);