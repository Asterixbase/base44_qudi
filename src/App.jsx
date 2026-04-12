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
import Settings from './pages/Settings';
import CircleDetail from './pages/CircleDetail';
import CollectDues from './pages/CollectDues';
import PayoutScheduler from './pages/PayoutScheduler';
import InviteSystem from './pages/InviteSystem';
import MemberProfile from './pages/MemberProfile';
import MemberContributionHistory from './pages/MemberContributionHistory';
import PayoutRoadmap from './pages/PayoutRoadmap';
import PenaltySettings from './pages/PenaltySettings';
import CollectionMonitor from './pages/CollectionMonitor';
import ReminderSchedule from './pages/ReminderSchedule';
import CashFlowForecast from './pages/CashFlowForecast';
import CrossBorderPayouts from './pages/CrossBorderPayouts';
import DisputeDashboard from './pages/DisputeDashboard';
import InsuranceManagement from './pages/InsuranceManagement';
import ReferralHub from './pages/ReferralHub';
import PenaltyLedgerPage from './pages/PenaltyLedgerPage';
import Registration from './pages/Registration';
import HandoverDoc from './pages/HandoverDoc';
import GuarantorHealth from './pages/GuarantorHealth';
import SmartPayoutScheduler from './pages/SmartPayoutScheduler';
import ReconciliationPage from './pages/ReconciliationPage';
import CircleAnalyticsPage from './pages/CircleAnalyticsPage';
import PayoutTimeline from './pages/PayoutTimeline';
import Walkthrough from './pages/Walkthrough';


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

          {/* ── Qudi core ── */}
          <Route path="/home" element={<PageSlide><Home /></PageSlide>} />
          <Route path="/circle-detail" element={<PageSlide><CircleDetail /></PageSlide>} />
          <Route path="/collect-dues" element={<PageSlide><CollectDues /></PageSlide>} />
          <Route path="/payout-scheduler" element={<PageSlide><PayoutScheduler /></PageSlide>} />
          <Route path="/invitations" element={<PageSlide><InviteSystem /></PageSlide>} />
          <Route path="/member-profile" element={<PageSlide><MemberProfile /></PageSlide>} />
          <Route path="/member-history" element={<PageSlide><MemberContributionHistory /></PageSlide>} />
          <Route path="/payout-roadmap" element={<PageSlide><PayoutRoadmap /></PageSlide>} />
          <Route path="/penalty-settings" element={<PageSlide><PenaltySettings /></PageSlide>} />
          <Route path="/collection-monitor" element={<PageSlide><CollectionMonitor /></PageSlide>} />
          <Route path="/reminders" element={<PageSlide><ReminderSchedule /></PageSlide>} />
          <Route path="/cash-flow" element={<PageSlide><CashFlowForecast /></PageSlide>} />
          <Route path="/cross-border" element={<PageSlide><CrossBorderPayouts /></PageSlide>} />
          <Route path="/disputes" element={<PageSlide><DisputeDashboard /></PageSlide>} />
          <Route path="/insurance" element={<PageSlide><InsuranceManagement /></PageSlide>} />
          <Route path="/referrals" element={<PageSlide><ReferralHub /></PageSlide>} />
          <Route path="/penalty-ledger" element={<PageSlide><PenaltyLedgerPage /></PageSlide>} />
          <Route path="/guarantor-health" element={<PageSlide><GuarantorHealth /></PageSlide>} />
          <Route path="/smart-payout" element={<PageSlide><SmartPayoutScheduler /></PageSlide>} />
          <Route path="/reconciliation" element={<PageSlide><ReconciliationPage /></PageSlide>} />
          <Route path="/circle-analytics" element={<PageSlide><CircleAnalyticsPage /></PageSlide>} />
          <Route path="/payout-timeline" element={<PageSlide><PayoutTimeline /></PageSlide>} />
          <Route path="/walkthrough" element={<Walkthrough />} />
          <Route path="/register" element={<PageSlide><Registration /></PageSlide>} />
          <Route path="/settings" element={<PageSlide><Settings /></PageSlide>} />
          <Route path="/handover" element={<HandoverDoc />} />

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