import { Toaster } from "@/components/ui/toaster"
import { AnimatePresence, motion } from 'framer-motion';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Splash from './pages/Splash';
import Home from './pages/Home';
import SoldToday from './pages/SoldToday';
import LowStock from './pages/LowStock';
import ProductDetail from './pages/ProductDetail';
import QuickSale from './pages/sales/QuickSale';
import SaleConfirmed from './pages/sales/SaleConfirmed';
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
import BottomNav from './components/BottomNav';


const pageVariants = {
  initial: { x: '100%', opacity: 0 },
  in:      { x: 0,      opacity: 1 },
  out:     { x: '-30%', opacity: 0 },
};
const pageTransition = { type: 'tween', duration: 0.22, ease: 'easeInOut' };

function PageSlide({ children }) {
  return (
    <motion.div
      initial="initial" animate="in" exit="out"
      variants={pageVariants}
      transition={pageTransition}
      style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, overflowY: 'auto' }}
    >
      {children}
    </motion.div>
  );
}

const AuthenticatedApp = () => {
  const location = useLocation();
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
    <div className="safe-area-inset" style={{ position: 'relative', height: '100dvh', overflow: 'hidden' }}>
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageSlide><Splash /></PageSlide>} />
          <Route path="/dashboard" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<PageSlide><Home /><BottomNav /></PageSlide>} />
          <Route path="/sold-today" element={<PageSlide><SoldToday /></PageSlide>} />
          <Route path="/low-stock" element={<PageSlide><LowStock /></PageSlide>} />
          <Route path="/product/:id" element={<PageSlide><ProductDetail /></PageSlide>} />
          <Route path="/home/sale" element={<PageSlide><QuickSale /></PageSlide>} />
          <Route path="/sale-ok" element={<PageSlide><SaleConfirmed /></PageSlide>} />
          <Route path="/notifications" element={<PageSlide><StockNotifications /></PageSlide>} />
          <Route path="/predictions" element={<PageSlide><StockPredictions /></PageSlide>} />
          <Route path="/activity" element={<PageSlide><ActivityFeed /></PageSlide>} />
          <Route path="/scan" element={<PageSlide><Scanner /></PageSlide>} />
          <Route path="/stock-detail" element={<PageSlide><Stock /></PageSlide>} />
          <Route path="/scan-inventory" element={<PageSlide><BarcodeInventoryScanner /></PageSlide>} />
          <Route path="/reports" element={<PageSlide><Reports /></PageSlide>} />
          <Route path="/settings" element={<PageSlide><Settings /></PageSlide>} />
          <Route path="/purchase-orders" element={<PageSlide><PurchaseOrders /></PageSlide>} />
          <Route path="/forecasting" element={<PageSlide><StockForecasting /></PageSlide>} />
          <Route path="*" element={<PageSlide><PageNotFound /></PageSlide>} />
        </Routes>
      </AnimatePresence>
    </div>
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