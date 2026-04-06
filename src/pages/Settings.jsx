import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

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
        <button
          onClick={handleLogout}
          disabled={loading}
          className="w-full bg-destructive text-white py-3 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50"
        >
          {loading ? 'Logging out...' : 'Logout'}
        </button>
      </div>
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