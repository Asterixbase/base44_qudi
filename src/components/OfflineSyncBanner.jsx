import { AlertCircle, CheckCircle2, Wifi, WifiOff } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export default function OfflineSyncBanner() {
  const { isOnline, pendingCount, syncStatus, lastSyncTime } = useOfflineSync();

  // No banner if online and no pending items
  if (isOnline && pendingCount === 0) {
    return null;
  }

  // Offline state - waiting for network
  if (!isOnline) {
    return (
      <div className="bg-amber-50 border-l-4 border-amber-400 p-3 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              You're offline
            </p>
            <p className="text-xs text-amber-700 mt-1">
              {pendingCount > 0
                ? `${pendingCount} transaction${pendingCount !== 1 ? 's' : ''} queued. They'll sync when online.`
                : 'Changes will sync when connected.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Syncing state
  if (syncStatus === 'syncing' && pendingCount > 0) {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Wifi className="w-5 h-5 text-blue-600 flex-shrink-0 animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800">
              Syncing transactions...
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Uploading {pendingCount} transaction{pendingCount !== 1 ? 's' : ''} to server
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (syncStatus === 'error') {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-3 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              Sync error
            </p>
            <p className="text-xs text-red-700 mt-1">
              {pendingCount} transaction{pendingCount !== 1 ? 's' : ''} pending. Will retry automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Synced successfully
  if (lastSyncTime && pendingCount === 0) {
    return (
      <div className="bg-green-50 border-l-4 border-green-400 p-3 sticky top-0 z-40 animate-in fade-in duration-500">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">
              All synced
            </p>
            <p className="text-xs text-green-700 mt-1">
              Offline data synced successfully
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}