import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Settings, HelpCircle, Lock, LogOut, BarChart3, Zap } from 'lucide-react';

export default function MoreTab() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-primary text-white p-4 sticky top-0 z-40">
        <h1 className="text-2xl font-bold">More</h1>
      </div>

      {/* Profile Card */}
      {user && (
        <div className="bg-card border border-border rounded-lg m-4 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold">
              {user.full_name?.charAt(0) || 'A'}
            </div>
            <div>
              <p className="font-semibold text-foreground">{user.full_name}</p>
              <p className="text-xs text-foreground/60">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="text-sm text-primary hover:underline"
          >
            Edit profile →
          </button>
        </div>
      )}

      {/* Menu Items */}
      <div className="px-4 space-y-1">
        <MenuItem label="Settings" icon={Settings} onClick={() => navigate('/settings')} />
        <MenuItem label="Help & Support" icon={HelpCircle} onClick={() => navigate('/help')} />
        <MenuItem label="Analytics" icon={BarChart3} onClick={() => navigate('/analytics')} />
        
        {user?.role === 'admin' && (
          <>
            <div className="my-3 pt-3 border-t border-border"></div>
            <MenuItem label="System Health" icon={Zap} onClick={() => navigate('/admin/system')} highlight />
            <MenuItem label="Security Audit" icon={Lock} onClick={() => navigate('/admin/security')} highlight />
          </>
        )}

        <div className="my-3 pt-3 border-t border-border"></div>
        <MenuItem label="Logout" icon={LogOut} onClick={() => logout()} className="text-destructive" />
      </div>
    </div>
  );
}

function MenuItem({ label, icon: Icon, onClick, highlight, className }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition ${
        highlight ? 'bg-primary/5 border border-primary/20' : 'bg-card border border-border'
      } ${className || 'text-foreground'}`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );
}