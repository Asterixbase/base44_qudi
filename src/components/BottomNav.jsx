import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ShoppingCart, Building2, FileText, MoreHorizontal } from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { path: '/home', label: 'Sales', icon: Home },
    { path: '/stock', label: 'Stock', icon: ShoppingCart },
    { path: '/credit', label: 'Credit', icon: Building2 },
    { path: '/tax', label: 'Tax', icon: FileText },
    { path: '/more', label: 'More', icon: MoreHorizontal },
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border flex justify-around items-center">
      {tabs.map(({ path, label, icon: Icon }) => (
        <button
          key={path}
          onClick={() => navigate(path)}
          className={`flex-1 flex flex-col items-center justify-center py-3 transition ${
            isActive(path)
              ? 'text-primary border-t-2 border-primary'
              : 'text-foreground/50 hover:text-foreground'
          }`}
        >
          <Icon className="w-6 h-6 mb-1" />
          <span className="text-xs font-medium">{label}</span>
        </button>
      ))}
    </nav>
  );
}