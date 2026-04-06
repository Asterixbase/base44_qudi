import { useNavigate } from 'react-router-dom';
import { Settings, BarChart3, LogOut } from 'lucide-react';

export default function MoreTab() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-primary text-white p-4">
        <h1 className="text-2xl font-bold">⋯ More</h1>
        <p className="text-sm text-primary-light">Settings & reports</p>
      </div>

      <div className="p-4 space-y-2">
        <button onClick={() => navigate('/reports')} className="w-full bg-card border border-border rounded-lg p-4 text-left hover:border-primary transition">
          <BarChart3 className="w-5 h-5 text-primary mb-2" />
          <p className="font-semibold text-foreground">Reports</p>
        </button>
        <button onClick={() => navigate('/settings')} className="w-full bg-card border border-border rounded-lg p-4 text-left hover:border-primary transition">
          <Settings className="w-5 h-5 text-primary mb-2" />
          <p className="font-semibold text-foreground">Settings</p>
        </button>
      </div>
    </div>
  );
}