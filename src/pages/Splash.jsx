import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          navigate('/home');
        } else {
          navigate('/login');
        }
      } catch {
        navigate('/login');
      }
    };

    const timer = setTimeout(checkAuth, 1500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{ minHeight: '100dvh', background: '#1A1208', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🫂</div>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: '#EBA020', letterSpacing: -1, margin: 0 }}>Qudi</h1>
        <p style={{ color: '#C4B080', fontSize: 16, marginTop: 6 }}>Money Circles, Built on Trust</p>
        <div className="mt-8 w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );
}