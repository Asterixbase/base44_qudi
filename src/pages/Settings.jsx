import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { AnimatePresence, motion } from 'framer-motion';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';
import ReorderSettings from '@/components/ReorderSettings';

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showReorderSettings, setShowReorderSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      // In production: call account deletion API
      await base44.auth.logout('/');
    } catch {
      setDeleteLoading(false);
    }
  };

  const handleLogout = async () => {
    await base44.auth.logout('/');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Offline Sync Banner */}
      <OfflineSyncBanner />

      {/* Header */}
      <div className="bg-primary text-white p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-xl">←</button>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </div>

      {/* Account Section */}
      <div className="p-4">
        <h2 className="text-sm font-semibold uppercase text-foreground/60 tracking-wider mb-4">Account</h2>
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <SettingItem label="Profile" value="Manage" onClick={() => navigate('/profile')} />
          <SettingItem label="Email Notifications" toggle={true} />
          <SettingItem label="Auto-sync" toggle={true} value="On" />
          <SettingItem label="Push Notifications" toggle={true} />
        </div>
      </div>

      {/* App Section */}
      <div className="p-4">
        <h2 className="text-sm font-semibold uppercase text-foreground/60 tracking-wider mb-4">App</h2>
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <SettingItem label="App Version" value="1.0.0" />
          <SettingItem label="Storage Used" value="2.4 MB" />
          <SettingItem label="Language" value="English" onClick={() => {}} />
          <SettingItem label="About" value="" onClick={() => navigate('/about')} />
        </div>
      </div>

      {/* Inventory Management */}
      <div className="p-4">
        <h2 className="text-sm font-semibold uppercase text-foreground/60 tracking-wider mb-4">Inventory</h2>
        <div className="bg-card border border-border rounded-lg p-4">
          <button
            onClick={() => setShowReorderSettings(!showReorderSettings)}
            className="w-full text-left py-2 font-medium text-foreground hover:text-primary transition"
          >
            {showReorderSettings ? '▼' : '▶'} Reorder Level Settings
          </button>
          {showReorderSettings && (
            <div className="mt-4 pt-4 border-t border-border">
              <ReorderSettings />
            </div>
          )}
        </div>
      </div>

      {/* Offline Data */}
      <div className="p-4">
        <h2 className="text-sm font-semibold uppercase text-foreground/60 tracking-wider mb-4">Offline</h2>
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <SettingItem
            label="Clear Offline Data"
            value="Manage"
            onClick={() => {
              if (confirm('Clear all offline data?')) {
                localStorage.removeItem('sikasem_sync_queue');
                localStorage.removeItem('sikasem_products_cache');
                alert('Offline data cleared');
              }
            }}
          />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="p-4">
        <h2 className="text-sm font-semibold uppercase text-destructive tracking-wider mb-4">Danger Zone</h2>
        <div className="space-y-3">
          <button
            onClick={handleLogout}
            disabled={loading}
            className="w-full bg-destructive text-white py-3 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50"
          >
            {loading ? 'Logging out...' : 'Logout'}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full border-2 border-destructive text-destructive py-3 rounded-lg font-medium hover:bg-red-50 transition"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl p-6 z-50 shadow-xl max-w-sm mx-auto"
            >
              <div className="text-4xl text-center mb-4">⚠️</div>
              <h3 className="text-lg font-bold text-center text-foreground mb-2">Delete your account?</h3>
              <p className="text-sm text-center text-foreground/60 mb-6">
                This will permanently delete all your circles, contributions, and history. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 border border-border py-3 rounded-xl font-semibold"
                >Cancel</button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="flex-1 bg-destructive text-white py-3 rounded-xl font-semibold disabled:opacity-50"
                >{deleteLoading ? 'Deleting…' : 'Yes, delete'}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingItem({ label, value, toggle, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between py-2 ${onClick ? 'cursor-pointer hover:opacity-70' : ''}`}
    >
      <span className="font-medium text-foreground">{label}</span>
      {toggle ? (
        <div className="w-12 h-6 bg-accent rounded-full flex items-center px-1">
          <div className="w-5 h-5 bg-white rounded-full ml-auto"></div>
        </div>
      ) : (
        <span className="text-foreground/60 text-sm">{value}</span>
      )}
    </div>
  );
}