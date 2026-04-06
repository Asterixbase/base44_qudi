import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Splash from './pages/Splash';
import SalesTab from './pages/tabs/SalesTab';
import StockTab from './pages/tabs/StockTab';
import CreditTab from './pages/tabs/CreditTab';
import TaxTab from './pages/tabs/TaxTab';
import MoreTab from './pages/tabs/MoreTab';
import QuickSale from './pages/sales/QuickSale';
import SaleConfirmed from './pages/sales/SaleConfirmed';
import BottomNav from './components/BottomNav';
import StockNotifications from './pages/StockNotifications';
import StockPredictions from './pages/StockPredictions';
import ActivityFeed from './pages/ActivityFeed';
import Scanner from './pages/Scanner';
import Stock from './pages/Stock';
import BarcodeInventoryScanner from './pages/BarcodeInventoryScanner';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import PurchaseOrders from './pages/PurchaseOrders';
import StockForecasting from './pages/StockForecasting';


const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/home" element={<><SalesTab /><BottomNav /></>} />
      <Route path="/home/sale" element={<QuickSale />} />
      <Route path="/sale-ok" element={<SaleConfirmed />} />
      <Route path="/stock" element={<><StockTab /><BottomNav /></>} />
      <Route path="/credit" element={<><CreditTab /><BottomNav /></>} />
      <Route path="/tax" element={<><TaxTab /><BottomNav /></>} />
      <Route path="/more" element={<><MoreTab /><BottomNav /></>} />
      <Route path="/notifications" element={<StockNotifications />} />
      <Route path="/predictions" element={<StockPredictions />} />
      <Route path="/activity" element={<ActivityFeed />} />
      <Route path="/scan" element={<Scanner />} />
      <Route path="/stock-detail" element={<Stock />} />
      <Route path="/scan-inventory" element={<BarcodeInventoryScanner />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/purchase-orders" element={<PurchaseOrders />} />
      <Route path="/forecasting" element={<StockForecasting />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App