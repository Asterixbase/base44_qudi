import { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const S = {
  page: { fontFamily: 'Inter, Arial, sans-serif', background: '#fff', color: '#1A1208', maxWidth: 900, margin: '0 auto', padding: '40px 48px' },
  h2: { fontSize: 20, fontWeight: 700, color: '#1A1208', borderBottom: '2px solid #EBA020', paddingBottom: 6, marginTop: 40, marginBottom: 16 },
  h3: { fontSize: 15, fontWeight: 700, color: '#1A1208', marginTop: 20, marginBottom: 6 },
  p: { fontSize: 13, lineHeight: 1.7, color: '#3A2A10', marginBottom: 8 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 },
  th: { background: '#1A1208', color: '#EBA020', padding: '8px 10px', textAlign: 'left', fontWeight: 700 },
  td: { padding: '7px 10px', borderBottom: '1px solid #E0DBC4', verticalAlign: 'top' },
  tdAlt: { padding: '7px 10px', borderBottom: '1px solid #E0DBC4', background: '#F7F2E8', verticalAlign: 'top' },
  badge: { display: 'inline-block', background: '#FFF8E1', color: '#856404', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600, marginRight: 4 },
  code: { fontFamily: 'monospace', background: '#F7F2E8', border: '1px solid #E0DBC4', borderRadius: 4, padding: '2px 6px', fontSize: 11 },
  codeBlock: { fontFamily: 'monospace', background: '#1A1208', color: '#EBA020', borderRadius: 8, padding: '14px 16px', fontSize: 11, lineHeight: 1.7, overflowX: 'auto', marginBottom: 12, whiteSpace: 'pre-wrap' },
  tip: { background: '#FFF8E1', border: '1px solid #EBA020', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#856404', marginBottom: 12 },
  warn: { background: '#FCE4E4', border: '1px solid #C0392B', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#721C24', marginBottom: 12 },
  info: { background: '#E3F0FF', border: '1px solid #2D6FA8', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#2D6FA8', marginBottom: 12 },
  divider: { height: 1, background: '#E0DBC4', margin: '32px 0' },
  coverBand: { background: '#1A1208', padding: '32px 48px', margin: '-40px -48px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { fontSize: 42, fontWeight: 800, color: '#EBA020', letterSpacing: -1 },
  coverSub: { color: '#C4B080', fontSize: 14 },
  toc: { background: '#F7F2E8', border: '1px solid #E0DBC4', borderRadius: 10, padding: '20px 24px', marginBottom: 32 },
  flowBox: { background: '#F7F2E8', border: '1px solid #E0DBC4', borderRadius: 8, padding: '10px 14px', marginBottom: 6, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  arrow: { color: '#EBA020', fontWeight: 700, fontSize: 14, margin: '0 6px' },
};

function Row({ children, alt }) {
  return (
    <tr>
      {children.map((c, i) => (
        <td key={i} style={alt && i === 0 ? S.tdAlt : S.td}>{c}</td>
      ))}
    </tr>
  );
}

export default function HandoverDoc() {
  const contentRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  // Auto-download on mount after content renders
  useEffect(() => {
    const timer = setTimeout(() => handleDownloadPDF(), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const element = contentRef.current;
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        windowWidth: 900,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = pdfWidth / imgWidth;
      const totalHeight = imgHeight * ratio;
      let position = 0;
      let pageCount = 0;
      while (position < totalHeight) {
        if (pageCount > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -position, pdfWidth, totalHeight);
        position += pdfHeight;
        pageCount++;
      }
      pdf.save('Qudi-Agency-Handover-Document.pdf');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ background: '#F7F2E8', minHeight: '100vh', paddingBottom: 60 }}>
      {/* Download toolbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#1A1208', padding: '10px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        <div style={{ color: '#EBA020', fontWeight: 800, fontSize: 18 }}>🫂 Qudi — Handover Doc</div>
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          style={{
            background: downloading ? '#856404' : '#EBA020',
            color: '#1A1208', border: 'none', borderRadius: 8,
            padding: '10px 24px', fontWeight: 800, fontSize: 14,
            cursor: downloading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {downloading ? '⏳ Generating PDF...' : '⬇ Download PDF'}
        </button>
      </div>

      {/* Printable content */}
      <div ref={contentRef} style={S.page}>
        {/* Cover */}
        <div style={S.coverBand}>
          <div>
            <div style={S.logo}>Qudi 🫂</div>
            <div style={S.coverSub}>Money Circles, Built on Trust</div>
          </div>
          <div style={{ textAlign: 'right', color: '#C4B080', fontSize: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#EBA020', marginBottom: 4 }}>Agency Handover Document</div>
            <div>Version 1.0 · April 2026</div>
            <div>Platform: Base44 (React + Deno)</div>
            <div style={{ marginTop: 6 }}>Prepared for: Development Handover</div>
          </div>
        </div>

        {/* TOC */}
        <div style={S.toc}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Table of Contents</div>
          {[
            '1. Project Overview',
            '2. Technology Stack & Platform',
            '3. Design Tokens & Brand',
            '4. Entity Data Model (Database)',
            '5. All Screens & Pages',
            '6. Screen Flow & Navigation Wiring',
            '7. Components Library',
            '8. Backend Functions',
            '9. Integrations & SDK',
            '10. Automations',
            '11. Auth & User Management',
            '12. Mobile / WebView Configuration',
            '13. Key Business Logic Libraries',
            '14. GitHub Connector',
            '15. Known Gaps & Next Steps',
          ].map(t => <div key={t} style={{ fontSize: 13, color: '#2D6FA8', marginBottom: 5 }}>{t}</div>)}
        </div>

        {/* 1 */}
        <h2 style={S.h2}>1. Project Overview</h2>
        <p style={S.p}><strong>Qudi</strong> is a standalone mobile-first money circles (Susu / Tontine) management platform built independently for West African diaspora and local communities. It enables groups to pool savings, collect contributions via Mobile Money (MoMo), manage payout schedules, handle disputes, and provide insurance coverage against defaults.</p>
        <div style={S.info}>ℹ️ Qudi is a completely independent application. It has no shared codebase, entities, functions, or logic with any other product.</div>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Attribute</th><th style={S.th}>Detail</th></tr></thead>
          <tbody>
            <Row children={['App Name', 'Qudi']} />
            <Row alt children={['Tagline', 'Money Circles, Built on Trust']} />
            <Row children={['Primary Market', 'Ghana (GHS / MoMo) + UK Diaspora (GBP)']} />
            <Row alt children={['Primary Currency', 'GHS (Ghana Cedis)']} />
            <Row children={['App Type', 'Mobile-first PWA / native WebView']} />
            <Row alt children={['Platform', 'Base44 (hosted React + Deno backend functions)']} />
            <Row children={['Auth', 'Base44 platform auth (email / magic link)']} />
            <Row alt children={['Deployment', 'Base44 preview + production environments']} />
          </tbody>
        </table>

        {/* 2 */}
        <h2 style={S.h2}>2. Technology Stack & Platform</h2>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Layer</th><th style={S.th}>Technology</th><th style={S.th}>Notes</th></tr></thead>
          <tbody>
            <Row children={['Frontend', 'React 18 + Vite', 'JSX components, no TypeScript in pages']} />
            <Row alt children={['Styling', 'Tailwind CSS + inline styles', 'Design tokens via CSS variables in index.css']} />
            <Row children={['Routing', 'react-router-dom v6', 'BrowserRouter, AnimatePresence page slide transitions']} />
            <Row alt children={['Animations', 'Framer Motion v11', 'Page slides, bottom sheets']} />
            <Row children={['Charts', 'Recharts', 'Bar, Line, Area charts in forecasting screens']} />
            <Row alt children={['UI Components', 'shadcn/ui + Radix UI', 'Located in @/components/ui/ — do not modify directly']} />
            <Row children={['Icons', 'Lucide React', 'Limited — most icons are emoji for cultural feel']} />
            <Row alt children={['Backend / DB', 'Base44 Entities SDK', 'NoSQL-style with filter/list/create/update/delete']} />
            <Row children={['Backend Functions', 'Deno Deploy via Base44', 'HTTP handlers in functions/ folder']} />
            <Row alt children={['Auth', 'Base44 AuthProvider + useAuth hook', 'Magic link / social login — platform managed']} />
            <Row children={['PDF Generation', 'jsPDF + html2canvas', 'CircleSummaryPDF component + this handover doc']} />
            <Row alt children={['State', 'React useState / useEffect', 'No global state manager']} />
            <Row children={['Data Fetching', '@tanstack/react-query', 'QueryClientProvider wired in App.jsx']} />
          </tbody>
        </table>
        <div style={S.tip}>⚡ Base44 handles all hosting, database, auth, and serverless function deployment. No separate infrastructure is required.</div>

        {/* 3 */}
        <h2 style={S.h2}>3. Design Tokens & Brand</h2>
        <p style={S.p}>All colours are defined in <span style={S.code}>lib/qudiTokens.js</span> and imported as <span style={S.code}>C</span> throughout the app. Tailwind CSS variables are configured in <span style={S.code}>index.css</span> and mapped in <span style={S.code}>tailwind.config.js</span>.</p>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Token</th><th style={S.th}>Hex</th><th style={S.th}>Usage</th></tr></thead>
          <tbody>
            <Row children={['C.ink', '#1A1208', 'Primary dark background, headers']} />
            <Row alt children={['C.cream', '#F7F2E8', 'App background']} />
            <Row children={['C.gold', '#EBA020', 'Primary CTA buttons, highlights']} />
            <Row alt children={['C.goldText', '#B8860B', 'Text links, financial emphasis']} />
            <Row children={['C.white', '#FFFFFF', 'Card surfaces']} />
            <Row alt children={['C.border', '#E0DBC4', 'Card borders, dividers']} />
            <Row children={['C.muted', '#6B5A3A', 'Secondary text']} />
            <Row alt children={['C.hintOnDark', '#C4B080', 'Text on dark backgrounds']} />
            <Row children={['C.green / greenBg / greenTx', '#1B7A3A / #D4EDDA / #155724', 'Paid / success states']} />
            <Row alt children={['C.red / redBg', '#C0392B / #FCE4E4', 'Failed / error states']} />
            <Row children={['C.amber / amberBg / amberTx', '#8A5C00 / #FFF8E1 / #856404', 'Pending / warning states']} />
            <Row alt children={['C.teal / tealBg / tealTx', '#008B94 / #D1ECF1 / #0C5460', 'Insured / info states']} />
            <Row children={['C.forest / C.crimson', '#2D6A2D / #8B1A1A', 'Kente stripe accents']} />
          </tbody>
        </table>
        <p style={S.p}><strong>KenteStripe</strong> — decorative 8-segment stripe component (gold, ink, forest, crimson) placed below every dark header as a cultural design element.</p>
        <p style={S.p}><strong>Typography:</strong> Inter (Google Fonts, loaded in index.css). Weights: 400, 500, 600, 700, 800.</p>

        {/* 4 */}
        <h2 style={S.h2}>4. Entity Data Model (Database)</h2>
        <p style={S.p}>All entities are defined as JSON schemas in <span style={S.code}>entities/*.json</span>. Every entity auto-receives: <span style={S.code}>id</span>, <span style={S.code}>created_date</span>, <span style={S.code}>updated_date</span>, <span style={S.code}>created_by</span>.</p>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Entity</th><th style={S.th}>Key Fields</th><th style={S.th}>Purpose</th></tr></thead>
          <tbody>
            <Row children={['Circle', 'name, contribution_amount, frequency (weekly/monthly), max_members, status (forming/active/completed), current_cycle, payout_order (random/fixed/rotation/bid), pot_balance, organiser_id, is_insured, penalty_enabled, penalty_type + penalty_* config fields', 'Core savings circle record']} />
            <Row alt children={['Member', 'circle_id, user_id, full_name, phone, initials, payout_position, trust_score (0–100), payment_status (paid/pending/failed/overdue), is_verified, is_organiser, has_received_payout, guarantor_name', 'Circle membership record']} />
            <Row children={['Transaction', 'circle_id, member_id, type (in/out/adjustment/damage), quantity/amount, reference, momo_ref, cycle, sync_status', 'All financial transactions']} />
            <Row alt children={['Invitation', 'circle_id, circle_name, organiser_id, invitee_name/phone/email, invite_code, deep_link, status (pending/viewed/joined/expired), guarantor_name/phone, guarantor_linked, sms_sent, sms_log, expires_at', 'Circle invitations with deep links']} />
            <Row children={['Notification', 'circle_id, member_id, member_name, phone, message, status (sent/failed), channel (sms/in-app)', 'Notification delivery log']} />
            <Row alt children={['Penalty', 'circle_id, member_id, cycle, type (flat_fee/percentage/daily_interest), original_amount, penalty_amount, days_late, status (pending/paid/waived), member_notified, guarantor_notified', 'Active penalty records']} />
            <Row children={['PenaltyLedger', 'circle_id, member_id, cycle, penalty_type, penalty_amount, days_late, settlement_method, settlement_status, deducted_from_cycle', 'Full penalty accounting ledger']} />
            <Row alt children={['Dispute', 'circle_id, member_id, dispute_type (payment_status/suspicious_transaction/missed_payout), reported_status, claimed_status, transaction_ref, flagged_amount, proof_url, status (open/under_review/escrow_held/resolved/rejected), escrow_held, escrow_amount', 'Member dispute records']} />
            <Row children={['InsuranceClaim', 'circle_id, member_id, claim_type (missed_payout/member_default/fraud/death_hardship/other), amount_claimed, description, evidence_url, status (submitted/under_review/approved/rejected/paid_out), claim_ref, payout_amount', 'GLICO insurance claims']} />
            <Row alt children={['CrossBorderPayout', 'member_id, circle_id, country (UK/US/EU/AUS), gbp_amount, ghs_amount, exchange_rate, compliance_fee_gbp/ghs, bank_account (last 4), recipient_phone, status, fca_reference', 'UK/diaspora cross-border payouts']} />
            <Row children={['Referral', 'circle_id, referrer_id, invitee_email/name, status (pending/joined/rewarded), referrer_bonus_type/value, invitee_bonus_type/value', 'Referral and rewards tracking']} />
          </tbody>
        </table>

        {/* 5 */}
        <h2 style={S.h2}>5. All Screens & Pages</h2>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Route</th><th style={S.th}>File</th><th style={S.th}>Description</th><th style={S.th}>Auth?</th></tr></thead>
          <tbody>
            <Row children={['/', 'pages/Splash', 'Animated splash. Checks auth → /home or platform login', 'No']} />
            <Row alt children={['/home', 'pages/Home', 'Main dashboard: circle list, summary stats, quick actions, pull-to-refresh', 'Yes']} />
            <Row children={['/circle-detail', 'pages/CircleDetail', 'Circle deep-dive: pot balance, members, collect, pay out, penalties, disputes, analytics', 'Yes']} />
            <Row alt children={['/collect-dues', 'pages/CollectDues', 'Live MoMo collection with PIN auth, per-member status, real-time counter', 'Yes']} />
            <Row children={['/payout-scheduler', 'pages/PayoutScheduler', 'Payout sequence management (random/fixed/rotation/bid), trigger next payout', 'Yes']} />
            <Row alt children={['/invitations', 'pages/InviteSystem', 'Generate invite deep links, track invitations, SMS log, guarantor linking', 'Yes']} />
            <Row children={['/member-profile', 'pages/MemberProfile', 'Individual member trust score, payment history, guarantor, KYC status', 'Yes']} />
            <Row alt children={['/member-history', 'pages/MemberContributionHistory', 'Full contribution timeline for a member in a circle', 'Yes']} />
            <Row children={['/payout-roadmap', 'pages/PayoutRoadmap', 'Visual timeline of who gets paid when across all cycles', 'Yes']} />
            <Row alt children={['/penalty-settings', 'pages/PenaltySettings', 'Configure penalty rules (flat/percentage/daily), grace period, guarantor notify', 'Yes']} />
            <Row children={['/collection-monitor', 'pages/CollectionMonitor', 'Real-time collection health dashboard across all active circles', 'Yes']} />
            <Row alt children={['/reminders', 'pages/ReminderSchedule', 'Scheduled SMS/in-app reminder management for due contributions', 'Yes']} />
            <Row children={['/cash-flow', 'pages/CashFlowForecast', 'Multi-cycle cash flow projections with AI reliability scoring', 'Yes']} />
            <Row alt children={['/cross-border', 'pages/CrossBorderPayouts', 'UK/diaspora payout management with FCA compliance fee calculation', 'Yes']} />
            <Row children={['/disputes', 'pages/DisputeDashboard', 'All disputes: review, escrow-hold, resolve, reject', 'Yes']} />
            <Row alt children={['/insurance', 'pages/InsuranceManagement', 'GLICO insurance claim submission and status tracking', 'Yes']} />
            <Row children={['/referrals', 'pages/ReferralHub', 'Referral tracking and reward management', 'Yes']} />
            <Row alt children={['/penalty-ledger', 'pages/PenaltyLedgerPage', 'Full penalty accounting ledger view', 'Yes']} />
            <Row children={['/guarantor-health', 'pages/GuarantorHealth', 'Guarantor risk scoring and health dashboard', 'Yes']} />
            <Row alt children={['/smart-payout', 'pages/SmartPayoutScheduler', 'AI-assisted payout prioritisation and risk-adjusted scheduling', 'Yes']} />
            <Row children={['/reconciliation', 'pages/ReconciliationPage', 'End-of-cycle reconciliation: expected vs actual collections', 'Yes']} />
            <Row alt children={['/register', 'pages/Registration', 'Multi-step onboarding: personal info, KYC (NIA/NIMC/Onfido), OTP, terms', 'No']} />
            <Row children={['/settings', 'pages/Settings', 'Account settings, notifications, delete account, logout', 'Yes']} />
            <Row alt children={['/handover', 'pages/HandoverDoc', 'This document', 'Yes']} />
          </tbody>
        </table>

        {/* 6 */}
        <h2 style={S.h2}>6. Screen Flow & Navigation Wiring</h2>

        <h3 style={S.h3}>App Entry Flow</h3>
        <div style={S.flowBox}><strong>/</strong> Splash<span style={S.arrow}>→</span>isAuthenticated?<span style={S.arrow}>YES →</span><strong>/home</strong><span style={S.arrow}>NO →</span>Platform login<span style={S.arrow}>→ returns to</span><strong>/home</strong></div>

        <h3 style={S.h3}>Home → Circle</h3>
        <div style={S.flowBox}><strong>/home</strong><span style={S.arrow}>tap circle card →</span><strong>/circle-detail</strong> (via router state: {`{ circle }`})</div>
        <div style={S.flowBox}><strong>/home</strong><span style={S.arrow}>"+ New Circle" →</span><strong>/invitations</strong></div>
        <div style={S.flowBox}><strong>/home</strong><span style={S.arrow}>"📊 Reports" →</span><strong>/cash-flow</strong></div>

        <h3 style={S.h3}>Circle Detail → Sub-screens</h3>
        <div style={S.flowBox}><strong>/circle-detail</strong><span style={S.arrow}>🗺 Roadmap →</span><strong>/payout-roadmap</strong></div>
        <div style={S.flowBox}><strong>/circle-detail</strong><span style={S.arrow}>Collect dues →</span><strong>/collect-dues</strong></div>
        <div style={S.flowBox}><strong>/circle-detail</strong><span style={S.arrow}>Pay out →</span><strong>/payout-scheduler</strong></div>
        <div style={S.flowBox}><strong>/circle-detail</strong><span style={S.arrow}>Penalties →</span><strong>/penalty-settings</strong></div>
        <div style={S.flowBox}><strong>/circle-detail</strong><span style={S.arrow}>+ Invite member →</span><strong>/invitations</strong></div>
        <div style={S.flowBox}><strong>/circle-detail</strong><span style={S.arrow}>👤 Member profile →</span><strong>/member-profile</strong> (state: member, circle)</div>
        <div style={S.flowBox}><strong>/circle-detail</strong><span style={S.arrow}>📋 Member history →</span><strong>/member-history</strong> (state: member, circle)</div>
        <div style={S.flowBox}><strong>/circle-detail</strong><span style={S.arrow}>🚩 Flag dispute → DisputeModal → submit →</span>DB saved</div>
        <div style={S.flowBox}><strong>/circle-detail</strong><span style={S.arrow}>Tap member (pending) → MarkPaidModal → confirm →</span>Member status updated in DB</div>

        <h3 style={S.h3}>Collection Flow</h3>
        <div style={S.flowBox}><strong>/collect-dues</strong><span style={S.arrow}>"Send requests" →</span>PINConfirm modal<span style={S.arrow}>PIN ok →</span>Live MoMo collection (simulated)<span style={S.arrow}>complete →</span><strong>/circle-detail</strong></div>

        <h3 style={S.h3}>Payout Flow</h3>
        <div style={S.flowBox}><strong>/payout-scheduler</strong><span style={S.arrow}>select circle → view queue →</span>"🚀 Initiate Payout"<span style={S.arrow}>→</span>executeNextPayout() lib<span style={S.arrow}>→</span>DB updated</div>

        <h3 style={S.h3}>Bottom NavBar Tabs</h3>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Tab</th><th style={S.th}>Route</th></tr></thead>
          <tbody>
            <Row children={['⌂ Home', '/home']} />
            <Row alt children={['◎ Circles', '/circle-detail']} />
            <Row children={['🔔 Reminders', '/reminders']} />
            <Row alt children={['🚨 Alerts', '/collection-monitor']} />
            <Row children={['··· More', '/settings']} />
          </tbody>
        </table>
        <p style={S.p}>NavBar is fixed at the bottom, max-width 430px, centred. Active tab highlighted in goldText using <span style={S.code}>useLocation()</span> pathname matching.</p>

        <h3 style={S.h3}>State Passing Between Screens</h3>
        <p style={S.p}>React Router's <span style={S.code}>useLocation().state</span> is used to pass circle/member objects (no URL params):</p>
        <div style={S.codeBlock}>{`// Navigate with state
navigate('/circle-detail', { state: { circle: circleObject } });

// Receive on destination page
const { state } = useLocation();
const circle = state?.circle || fallbackDemoData;`}</div>

        {/* 7 */}
        <h2 style={S.h2}>7. Components Library</h2>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Component</th><th style={S.th}>Path</th><th style={S.th}>Props / Purpose</th></tr></thead>
          <tbody>
            <Row children={['KenteStripe', 'components/qudi/KenteStripe', 'height — decorative 8-colour Kente pattern bar']} />
            <Row alt children={['NavBar', 'components/qudi/NavBar', 'No props — bottom navigation, active state via useLocation']} />
            <Row children={['Header', 'components/qudi/Header', 'dark, title, subtitle, onBack — back button if onBack provided']} />
            <Row alt children={['Avatar', 'components/qudi/Avatar', 'initials, size, bg, color — circular initials avatar']} />
            <Row children={['TrustBadge', 'components/qudi/TrustBadge', 'score (0-100) — colour-coded trust tier chip']} />
            <Row alt children={['PINConfirm', 'components/qudi/PINConfirm', 'title, amount, recipient, onConfirm, onCancel — full-screen PIN overlay']} />
            <Row children={['FraudAlert', 'components/qudi/FraudAlert', 'type, onDismiss — dismissible fraud warning banner']} />
            <Row alt children={['DisputeModal', 'components/qudi/DisputeModal', 'member, circle, onClose, onSubmitted — raise dispute form sheet']} />
            <Row children={['MarkPaidModal', 'components/qudi/MarkPaidModal', 'member, circle, onClose, onSuccess — confirm manual payment marking']} />
            <Row alt children={['PenaltyBanner', 'components/qudi/PenaltyBanner', 'circle, member, daysLate — overdue penalty warning banner']} />
            <Row children={['ReminderButton', 'components/qudi/ReminderButton', 'members[], circle — bulk reminder send trigger']} />
            <Row alt children={['PayoutSchedule', 'components/qudi/PayoutSchedule', 'members[], circle — visual upcoming payout sequence']} />
            <Row children={['CircleAnalytics', 'components/qudi/CircleAnalytics', 'circle — mini analytics charts']} />
            <Row alt children={['CircleSummaryPDF', 'components/qudi/CircleSummaryPDF', 'circle, members[] — generates + downloads a jsPDF circle summary']} />
            <Row children={['BottomSheet', 'components/BottomSheet', 'open, onClose, options[], value, onChange, title — mobile option picker']} />
          </tbody>
        </table>

        {/* 8 */}
        <h2 style={S.h2}>8. Backend Functions</h2>
        <p style={S.p}>All backend functions live in <span style={S.code}>functions/</span> and run as Deno Deploy serverless handlers. Called from the frontend via:</p>
        <div style={S.codeBlock}>{`import { base44 } from "@/api/base44Client";
const response = await base44.functions.invoke('functionName', { param: value });
// response.data contains the returned payload`}</div>
        <div style={S.warn}>⚠️ The current backend functions in this workspace are scaffolded but not yet wired to Qudi's live financial operations. All collection and payout flows are currently simulated in the frontend. Real MoMo, SMS, and KYC backend functions need to be built.</div>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Function</th><th style={S.th}>Status</th><th style={S.th}>Purpose</th></tr></thead>
          <tbody>
            <Row children={['syncAuditToGitHub', 'Built', 'Pushes audit log data to connected GitHub repo']} />
            <Row alt children={['pushAuditToGitHub', 'Built', 'Pushes specific audit entries to GitHub']} />
            <Row children={['getFileContent', 'Built', 'Reads file content from GitHub repo']} />
            <Row alt children={['listRepoFiles', 'Built', 'Lists files in a GitHub repo']} />
            <Row children={['getGitHubIssues', 'Built', 'Fetches issues from a GitHub repo']} />
            <Row alt children={['collectMoMoDues', 'Not built', 'NEEDED: Trigger MTN MoMo collection requests per member']} />
            <Row children={['sendPayoutMoMo', 'Not built', 'NEEDED: Send payout via MoMo to a member']} />
            <Row alt children={['sendSMSReminder', 'Not built', 'NEEDED: Send SMS via Arkesel/Twilio to member']} />
            <Row children={['verifyKYC', 'Not built', 'NEEDED: Submit NIA/NIMC/Onfido KYC check']} />
            <Row alt children={['submitInsuranceClaim', 'Not built', 'NEEDED: Submit claim to GLICO API']} />
          </tbody>
        </table>

        {/* 9 */}
        <h2 style={S.h2}>9. Integrations & SDK</h2>
        <h3 style={S.h3}>Base44 Core Integrations (always available)</h3>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Integration</th><th style={S.th}>Status in Qudi</th></tr></thead>
          <tbody>
            <Row children={['InvokeLLM', 'Used in CashFlowForecast for AI-assisted collection projections. Model: gemini_3_flash.']} />
            <Row alt children={['SendEmail', 'Available — not yet wired to member email notifications']} />
            <Row children={['UploadFile', 'Used in InsuranceManagement for claim evidence upload']} />
            <Row alt children={['GenerateImage', 'Available — not currently used']} />
          </tbody>
        </table>
        <div style={S.codeBlock}>{`// InvokeLLM example (CashFlowForecast)
import { base44 } from "@/api/base44Client";
const result = await base44.integrations.Core.InvokeLLM({
  prompt: "Analyse these circle transactions and forecast collection rates...",
  response_json_schema: {
    type: "object",
    properties: { forecast: { type: "array" } }
  }
});`}</div>

        <h3 style={S.h3}>Planned Third-Party Integrations</h3>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Integration</th><th style={S.th}>Purpose</th><th style={S.th}>Provider</th></tr></thead>
          <tbody>
            <Row children={['Mobile Money', 'Live MoMo collection and payout', 'MTN MoMo API / Hubtel']} />
            <Row alt children={['SMS', 'Member reminders, OTP, invite messages', 'Arkesel (Ghana) / Twilio']} />
            <Row children={['KYC', 'Ghana Card NIA, NIMC, Onfido (UK)', 'NIA API / Onfido']} />
            <Row alt children={['Insurance', 'GLICO claim submission', 'GLICO Ghana API']} />
            <Row children={['FCA Compliance', 'UK cross-border payout compliance', 'FCA-registered payment processor']} />
            <Row alt children={['Push Notifications', 'Mobile push for reminders', 'Firebase FCM']} />
          </tbody>
        </table>

        {/* 10 */}
        <h2 style={S.h2}>10. Automations</h2>
        <p style={S.p}>No Qudi-specific automations have been configured yet. The following automations are recommended as part of the live build:</p>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Automation</th><th style={S.th}>Type</th><th style={S.th}>Trigger</th><th style={S.th}>Action</th></tr></thead>
          <tbody>
            <Row children={['Due Date Reminders', 'Scheduled', 'Daily 8am', 'Check upcoming dues, send SMS reminders via Arkesel']} />
            <Row alt children={['Penalty Auto-Apply', 'Entity', 'Member overdue N days', 'Create Penalty record, notify guarantor']} />
            <Row children={['Circle Completion', 'Entity', 'Member.has_received_payout updated', 'Check if all paid, mark Circle completed']} />
            <Row alt children={['Invitation Expiry', 'Scheduled', 'Daily', 'Mark expired invitations where expires_at has passed']} />
          </tbody>
        </table>

        {/* 11 */}
        <h2 style={S.h2}>11. Auth & User Management</h2>
        <p style={S.p}>Authentication is fully managed by the Base44 platform. There is no custom login page in Qudi.</p>
        <table style={S.table}>
          <thead><tr><th style={S.th}>SDK Method</th><th style={S.th}>Usage</th></tr></thead>
          <tbody>
            <Row children={['base44.auth.me()', 'Returns current user object: id, email, full_name, role']} />
            <Row alt children={['base44.auth.isAuthenticated()', 'Returns Promise<boolean> — used in Splash.jsx']} />
            <Row children={['base44.auth.redirectToLogin(nextUrl)', 'Sends user to platform login. Returns to nextUrl on success.']} />
            <Row alt children={['base44.auth.logout(redirectUrl)', 'Logs out current user, redirects to provided URL']} />
            <Row children={['base44.auth.updateMe(data)', 'Updates current user profile fields in the platform DB']} />
          </tbody>
        </table>
        <p style={S.p}><strong>User roles:</strong> <span style={S.badge}>admin</span><span style={S.badge}>user</span> — admins can access admin-only backend functions.</p>
        <div style={S.tip}>🔐 Splash.jsx checks <code>isAuthenticated()</code> after a 1.5s animation delay. Unauthenticated users are redirected to platform login with <code>redirectToLogin('/home')</code>.</div>

        {/* 12 */}
        <h2 style={S.h2}>12. Mobile / WebView Configuration</h2>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Config</th><th style={S.th}>Location</th><th style={S.th}>Detail</th></tr></thead>
          <tbody>
            <Row children={['Overscroll disabled', 'index.css', 'html, body { overscroll-behavior: none }']} />
            <Row alt children={['Safe area insets', 'index.css + components', '.safe-area-top/bottom using env(safe-area-inset-*)']} />
            <Row children={['Tap highlight removed', 'index.css', '-webkit-tap-highlight-color: transparent on all interactive elements']} />
            <Row alt children={['User select disabled', 'index.css', 'user-select: none on buttons, links, tabs']} />
            <Row children={['Viewport meta', 'index.html', 'width=device-width, initial-scale=1, viewport-fit=cover']} />
            <Row alt children={['Max width', 'All pages', 'maxWidth: 430px, margin: 0 auto — standard mobile frame']} />
            <Row children={['Page transitions', 'App.jsx → PageSlide', 'Framer Motion: slide in from right, slide out to left']} />
            <Row alt children={['Pull to refresh', 'hooks/usePullToRefresh.js', 'Custom hook — used on Home page']} />
            <Row children={['Dark mode', 'index.css', '@media (prefers-color-scheme: dark) overrides all CSS variables']} />
          </tbody>
        </table>

        {/* 13 */}
        <h2 style={S.h2}>13. Key Business Logic Libraries</h2>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Library</th><th style={S.th}>Path</th><th style={S.th}>What it does</th></tr></thead>
          <tbody>
            <Row children={['qudiTokens', 'lib/qudiTokens.js', 'All design colour tokens exported as C object']} />
            <Row alt children={['trustScore', 'lib/trustScore.js', 'enrichMembersWithTrust() — computes trust_delta and trust_reason per member based on payment history']} />
            <Row children={['payoutScheduler', 'lib/payoutScheduler.js', 'buildPayoutSequence(circle, members, bids) — ordered payout queue. executeNextPayout() — marks payout, updates DB']} />
            <Row alt children={['penaltyEngine', 'lib/penaltyEngine.js', 'Calculates penalty amounts based on circle penalty config (flat/percentage/daily_interest)']} />
            <Row children={['reminderScheduler', 'lib/reminderScheduler.js', 'Generates reminder schedule objects from circle frequency and due dates']} />
            <Row alt children={['collectionMonitor', 'lib/collectionMonitor.js', 'Aggregates collection health metrics across circles']} />
            <Row children={['guarantorHealthEngine', 'lib/guarantorHealthEngine.js', 'Scores guarantor risk based on linked members payment patterns']} />
            <Row alt children={['smartPayoutEngine', 'lib/smartPayoutEngine.js', 'AI-assisted payout prioritisation with risk weighting']} />
            <Row children={['reconciliationEngine', 'lib/reconciliationEngine.js', 'Compares expected vs actual collections per cycle']} />
            <Row alt children={['referralEngine', 'lib/referralEngine.js', 'Calculates referral reward bonuses and assignment']} />
            <Row children={['currencyConverter', 'lib/currencyConverter.js', 'GBP→GHS conversion with exchange rates and FCA compliance fees by diaspora country']} />
            <Row alt children={['fraudDetection', 'lib/fraudDetection.js', 'Flags suspicious transactions, wallet mismatches, SIM-swap risk']} />
            <Row children={['rateLimiter', 'lib/rateLimiter.js', 'Rate limiting for PIN verification, payout submission, cross-border payouts']} />
            <Row alt children={['validation', 'lib/validation.js', 'Phone, email, amount, PIN, bank account, name validators']} />
            <Row children={['auditLog', 'lib/auditLog.js', 'Creates audit trail entries for sensitive operations']} />
            <Row alt children={['payoutDistributionEngine', 'lib/payoutDistributionEngine.js', 'Multi-member payout distribution scenarios']} />
          </tbody>
        </table>

        <h3 style={S.h3}>Trust Score System</h3>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Payment Status</th><th style={S.th}>Trust Delta</th><th style={S.th}>Reason</th></tr></thead>
          <tbody>
            <Row children={['paid', '+5', 'On-time payment']} />
            <Row alt children={['pending', '0', 'Not yet due']} />
            <Row children={['failed', '−10', 'Payment failed']} />
            <Row alt children={['overdue', '−15', 'Payment overdue']} />
          </tbody>
        </table>

        {/* 14 */}
        <h2 style={S.h2}>14. GitHub Connector</h2>
        <p style={S.p}>An app-user GitHub connector is registered for Qudi to allow per-user audit log sync and code repository access.</p>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Attribute</th><th style={S.th}>Value</th></tr></thead>
          <tbody>
            <Row children={['Connector Name', 'qudi-app']} />
            <Row alt children={['Type', 'App User Connector (each user connects their own GitHub account)']} />
            <Row children={['Purpose', 'Audit log sync, file browsing, issue tracking via GitHub API']} />
            <Row alt children={['Backend usage', "base44.asServiceRole.connectors.getCurrentAppUserAccessToken('69d33066bb1428bbeeb208b4')"]} />
          </tbody>
        </table>
        <div style={S.codeBlock}>{`// Frontend: prompt user to connect GitHub
const url = await base44.connectors.connectAppUser("69d33066bb1428bbeeb208b4");
const popup = window.open(url, "_blank");

// Backend function: use GitHub token
const accessToken = await base44.asServiceRole.connectors
  .getCurrentAppUserAccessToken("69d33066bb1428bbeeb208b4");
const res = await fetch("https://api.github.com/repos/owner/repo/contents", {
  headers: { Authorization: \`Bearer \${accessToken}\` }
});`}</div>

        {/* 15 */}
        <h2 style={S.h2}>15. Known Gaps & Next Steps</h2>
        <div style={S.warn}>🔴 <strong>Not yet implemented (currently simulated in frontend):</strong>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>MTN MoMo API — collections and payouts are UI simulations only</li>
            <li>SMS via Arkesel/Twilio — messages are logged locally, not sent</li>
            <li>NIA / NIMC / Onfido KYC — simulated 2-second scan animation</li>
            <li>OTP verification on Registration step 3 — no SMS sent</li>
            <li>GLICO insurance API — claims saved to DB, not submitted to insurer</li>
            <li>FCA cross-border payout processor — amounts calculated, not transacted</li>
          </ul>
        </div>
        <div style={S.tip}>🟡 <strong>Recommended next steps:</strong>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>Build backend functions for MoMo collection, payout, and SMS (see Section 8)</li>
            <li>Configure Qudi-specific automations (reminders, penalty auto-apply — see Section 10)</li>
            <li>Implement deep link handling for invite codes: /register?invite=CODE</li>
            <li>Add Circle creation form flow (Home currently loads demo circles)</li>
            <li>Add Firebase FCM for native push notifications in WebView</li>
            <li>Add admin organiser dashboard with reporting and export</li>
            <li>Implement biometric auth (Touch ID / Face ID) via WebView bridge</li>
            <li>Connect InvokeLLM fully in CashFlowForecast with live DB data</li>
          </ul>
        </div>
        <div style={S.info}>🔵 <strong>File structure summary:</strong>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li><span style={S.code}>pages/</span> — All screen components (one file per screen)</li>
            <li><span style={S.code}>components/qudi/</span> — Qudi-specific reusable components</li>
            <li><span style={S.code}>components/ui/</span> — shadcn/ui base components (do not modify)</li>
            <li><span style={S.code}>lib/</span> — Business logic, design tokens, utilities</li>
            <li><span style={S.code}>hooks/</span> — Custom React hooks (usePullToRefresh, useOfflineSync, etc.)</li>
            <li><span style={S.code}>functions/</span> — Deno serverless backend function handlers</li>
            <li><span style={S.code}>entities/</span> — JSON schema definitions for all data models</li>
            <li><span style={S.code}>api/base44Client.js</span> — Pre-initialised Base44 SDK client</li>
          </ul>
        </div>

        <div style={S.divider} />
        <div style={{ textAlign: 'center', color: '#6B5A3A', fontSize: 12, paddingBottom: 32 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🫂</div>
          <strong>Qudi — Money Circles, Built on Trust</strong><br />
          Agency Handover Document v1.0 · April 2026<br />
          Built independently on Base44 Platform · React + Deno + Base44 SDK
        </div>
      </div>
    </div>
  );
}