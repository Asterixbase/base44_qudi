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
          navigate('/dashboard');
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
    <div className="min-h-screen bg-gradient-to-b from-primary to-primary-light flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-6xl font-bold text-white">📦</div>
        <h1 className="text-4xl font-bold text-white">Sikasem</h1>
        <p className="text-primary-light text-lg">Smart Inventory Management</p>
        <div className="mt-8 w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );
}