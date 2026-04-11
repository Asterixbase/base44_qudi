import { useEffect } from 'react';

const S = {
  page: { fontFamily: 'Inter, Arial, sans-serif', background: '#fff', color: '#1A1208', maxWidth: 900, margin: '0 auto', padding: '40px 48px' },
  h1: { fontSize: 32, fontWeight: 800, color: '#1A1208', marginBottom: 4 },
  h2: { fontSize: 20, fontWeight: 700, color: '#1A1208', borderBottom: '2px solid #EBA020', paddingBottom: 6, marginTop: 40, marginBottom: 16 },
  h3: { fontSize: 15, fontWeight: 700, color: '#1A1208', marginTop: 20, marginBottom: 6 },
  h4: { fontSize: 13, fontWeight: 700, color: '#4A3A1A', marginTop: 12, marginBottom: 4 },
  p: { fontSize: 13, lineHeight: 1.7, color: '#3A2A10', marginBottom: 8 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 },
  th: { background: '#1A1208', color: '#EBA020', padding: '8px 10px', textAlign: 'left', fontWeight: 700 },
  td: { padding: '7px 10px', borderBottom: '1px solid #E0DBC4', verticalAlign: 'top' },
  tdAlt: { padding: '7px 10px', borderBottom: '1px solid #E0DBC4', background: '#F7F2E8', verticalAlign: 'top' },
  badge: { display: 'inline-block', background: '#FFF8E1', color: '#856404', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600, marginRight: 4, marginBottom: 4 },
  badgeGreen: { display: 'inline-block', background: '#D4EDDA', color: '#155724', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600, marginRight: 4 },
  badgeBlue: { display: 'inline-block', background: '#E3F0FF', color: '#2D6FA8', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600, marginRight: 4 },
  code: { fontFamily: 'monospace', background: '#F7F2E8', border: '1px solid #E0DBC4', borderRadius: 4, padding: '2px 6px', fontSize: 11, color: '#1A1208' },
  codeBlock: { fontFamily: 'monospace', background: '#1A1208', color: '#EBA020', borderRadius: 8, padding: '14px 16px', fontSize: 11, lineHeight: 1.7, overflowX: 'auto', marginBottom: 12, whiteSpace: 'pre-wrap' },
  tip: { background: '#FFF8E1', border: '1px solid #EBA020', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#856404', marginBottom: 12 },
  warn: { background: '#FCE4E4', border: '1px solid #C0392B', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#721C24', marginBottom: 12 },
  info: { background: '#E3F0FF', border: '1px solid #2D6FA8', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#2D6FA8', marginBottom: 12 },
  divider: { height: 1, background: '#E0DBC4', margin: '32px 0' },
  coverBand: { background: '#1A1208', padding: '32px 48px', margin: '-40px -48px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { fontSize: 42, fontWeight: 800, color: '#EBA020', letterSpacing: -1 },
  coverSub: { color: '#C4B080', fontSize: 14 },
  toc: { background: '#F7F2E8', border: '1px solid #E0DBC4', borderRadius: 10, padding: '20px 24px', marginBottom: 32 },
  tocItem: { fontSize: 13, color: '#2D6FA8', marginBottom: 6, cursor: 'pointer', textDecoration: 'none' },
  flowBox: { background: '#F7F2E8', border: '1px solid #E0DBC4', borderRadius: 8, padding: '10px 14px', marginBottom: 6, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 },
  arrow: { color: '#EBA020', fontWeight: 700, fontSize: 14, margin: '0 6px' },
};

function Row({ children, alt }) {
  return <tr>{children.map((c, i) => <td key={i} style={i === 0 ? (alt ? S.tdAlt : S.td) : S.td}>{c}</td>)}</tr>;
}

export default function HandoverDoc() {
  useEffect(() => { document.title = 'Qudi — Agency Handover Document'; }, []);

  return (
    <div style={S.page}>
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
          <button
            onClick={() => window.print()}
            style={{ marginTop: 12, background: '#EBA020', color: '#1A1208', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >🖨 Print / Save PDF</button>
        </div>
      </div>

      {/* TOC */}
      <div style={S.toc}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#1A1208' }}>Table of Contents</div>
        {[
          ['1', 'Project Overview'],
          ['2', 'Technology Stack & Platform'],
          ['3', 'Design Tokens & Brand'],
          ['4', 'Entity Data Model (Database)'],
          ['5', 'All Screens & Pages'],
          ['6', 'Screen Flow & Navigation Wiring'],
          ['7', 'Components Library'],
          ['8', 'Backend Functions'],
          ['9', 'Integrations & SDK'],
          ['10', 'Automations'],
          ['11', 'Auth & User Management'],
          ['12', 'Mobile / WebView Configuration'],
          ['13', 'Key Business Logic Libraries'],
          ['14', 'GitHub Connector'],
          ['15', 'Known Gaps & Next Steps'],
        ].map(([n, t]) => (
          <div key={n} style={S.tocItem}>{n}. {t}</div>
        ))}
      </div>

      {/* 1 */}
      <h2 style={S.h2}>1. Project Overview</h2>
      <p style={S.p}><strong>Qudi</strong> is a mobile-first money circles (Susu/Tontine) management platform for West African diaspora and local communities. It enables groups of people to pool savings, collect contributions via Mobile Money (MoMo), manage payout schedules, handle disputes, and provide insurance coverage against defaults.</p>
      <table style={S.table}>
        <thead><tr><th style={S.th}>Attribute</th><th style={S.th}>Detail</th></tr></thead>
        <tbody>
          <Row alt={false} children={['App Name', 'Qudi']} />
          <Row alt={true} children={['Tagline', 'Money Circles, Built on Trust']} />
          <Row alt={false} children={['Primary Market', 'Ghana (GHS/MoMo) + UK Diaspora (GBP)']} />
          <Row alt={true} children={['Primary Currency', 'GHS (Ghana Cedis)']} />
          <Row alt={false} children={['App Type', 'Mobile-first PWA / native WebView']} />
          <Row alt={true} children={['Platform', 'Base44 (hosted React + Deno backend)']} />
          <Row alt={false} children={['Auth', 'Base44 platform auth (email/magic link)']} />
          <Row alt={true} children={['Deployment', 'Base44 preview + production environments']} />
        </tbody>
      </table>

      {/* 2 */}
      <h2 style={S.h2}>2. Technology Stack & Platform</h2>
      <table style={S.table}>
        <thead><tr><th style={S.th}>Layer</th><th style={S.th}>Technology</th><th style={S.th}>Notes</th></tr></thead>
        <tbody>
          <Row children={['Frontend', 'React 18 + Vite', 'JSX, no TypeScript in pages']} />
          <Row alt children={['Styling', 'Tailwind CSS + inline styles', 'Design tokens via CSS variables']} />
          <Row children={['Routing', 'react-router-dom v6', 'BrowserRouter, AnimatePresence page transitions']} />
          <Row alt children={['Animations', 'Framer Motion v11', 'Page slide transitions, bottom sheets']} />
          <Row children={['Charts', 'Recharts', 'Bar, Line, Area charts']} />
          <Row alt children={['UI Components', 'shadcn/ui + Radix', 'In @/components/ui/']} />
          <Row children={['Icons', 'Lucide React', 'Limited usage — mostly emoji icons used']} />
          <Row alt children={['Backend / DB', 'Base44 entities SDK', 'NoSQL-style with filter/list/create/update/delete']} />
          <Row children={['Backend Functions', 'Deno Deploy (via Base44)', 'HTTP handlers in functions/ folder']} />
          <Row alt children={['Auth', 'Base44 AuthProvider + useAuth hook', 'Magic link / social login managed by platform']} />
          <Row children={['PDF Generation', 'jsPDF (npm)', 'CircleSummaryPDF component']} />
          <Row alt children={['State', 'React useState/useEffect', 'No global state manager (Zustand installed but unused)']} />
          <Row children={['Data fetching', '@tanstack/react-query', 'QueryClientProvider in App.jsx']} />
        </tbody>
      </table>

      <div style={S.tip}>⚡ Base44 platform handles hosting, database, auth, and serverless functions. No separate infrastructure needed.</div>

      {/* 3 */}
      <h2 style={S.h2}>3. Design Tokens & Brand</h2>
      <p style={S.p}>All colours are defined in <span style={S.code}>lib/qudiTokens.js</span> and imported as <span style={S.code}>C</span> throughout the app. CSS variables for Tailwind are in <span style={S.code}>index.css</span>.</p>
      <table style={S.table}>
        <thead><tr><th style={S.th}>Token</th><th style={S.th}>Hex</th><th style={S.th}>Usage</th></tr></thead>
        <tbody>
          <Row children={['C.ink', '#1A1208', 'Primary dark background, headers']} />
          <Row alt children={['C.cream', '#F7F2E8', 'App background']} />
          <Row children={['C.gold', '#EBA020', 'Primary CTA buttons, highlights']} />
          <Row alt children={['C.goldText', '#B8860B', 'Text links, emphasis']} />
          <Row children={['C.white', '#FFFFFF', 'Card surfaces']} />
          <Row alt children={['C.border', '#E0DBC4', 'Card borders, dividers']} />
          <Row children={['C.muted', '#6B5A3A', 'Secondary text']} />
          <Row alt children={['C.hintOnDark', '#C4B080', 'Text on dark backgrounds']} />
          <Row children={['C.green / greenBg / greenTx', '#1B7A3A / #D4EDDA / #155724', 'Paid/success states']} />
          <Row alt children={['C.red / redBg', '#C0392B / #FCE4E4', 'Failed/error states']} />
          <Row children={['C.amber / amberBg / amberTx', '#8A5C00 / #FFF8E1 / #856404', 'Pending/warning states']} />
          <Row alt children={['C.teal / tealBg / tealTx', '#008B94 / #D1ECF1 / #0C5460', 'Insured/info states']} />
          <Row children={['C.blue / blueBg', '#2D6FA8 / #E3F0FF', 'Navigation/links']} />
          <Row alt children={['C.forest / C.crimson', '#2D6A2D / #8B1A1A', 'Kente stripe accents']} />
        </tbody>
      </table>
      <p style={S.p}><strong>KenteStripe</strong> — decorative 8-segment stripe component using gold, ink, forest, crimson. Appears below every dark header.</p>
      <p style={S.p}><strong>Font:</strong> Inter (Google Fonts, loaded in index.css). Weights: 400, 500, 600, 700, 800.</p>

      {/* 4 */}
      <h2 style={S.h2}>4. Entity Data Model (Database)</h2>
      <p style={S.p}>All entities are defined in <span style={S.code}>entities/*.json</span>. Every entity auto-gets: <span style={S.code}>id</span>, <span style={S.code}>created_date</span>, <span style={S.code}>updated_date</span>, <span style={S.code}>created_by</span>.</p>

      <h3 style={S.h3}>Core Entities</h3>
      <table style={S.table}>
        <thead><tr><th style={S.th}>Entity</th><th style={S.th}>Key Fields</th><th style={S.th}>Purpose</th></tr></thead>
        <tbody>
          <Row children={['Circle', 'name, contribution_amount, frequency (weekly/monthly), max_members, status (forming/active/completed), current_cycle, payout_order (random/fixed/rotation/bid), pot_balance, organiser_id, is_insured, penalty_enabled, penalty_type, penalty_*', 'Core savings circle record']} />
          <Row alt children={['Member', 'circle_id, user_id, full_name, phone, initials, payout_position, trust_score (0-100), payment_status (paid/pending/failed/overdue), is_verified, is_organiser, has_received_payout, guarantor_name', 'Circle membership']} />
          <Row children={['Transaction', 'product_id*, circle_id, member_id, type (in/out/adjustment/damage/collection), quantity/amount, reference, status, momo_ref, cycle, sync_status', 'All financial transactions']} />
          <Row alt children={['Invitation', 'circle_id, circle_name, organiser_id, invitee_name/phone/email, invite_code, deep_link, status (pending/viewed/joined/expired), guarantor_name/phone, guarantor_linked, sms_sent, sms_log, expires_at', 'Circle invitations with deep links']} />
          <Row children={['Notification', 'circle_id, member_id, member_name, phone, message, status (sent/failed), channel (sms/in-app)', 'Notification log']} />
          <Row alt children={['Penalty', 'circle_id, member_id, cycle, type (flat_fee/percentage/daily_interest), original_amount, penalty_amount, days_late, status (pending/paid/waived), member_notified, guarantor_notified', 'Penalty records']} />
          <Row children={['PenaltyLedger', 'circle_id, member_id, cycle, penalty_type, penalty_amount, days_late, settlement_method, settlement_status, deducted_from_cycle', 'Full penalty accounting ledger']} />
          <Row alt children={['Dispute', 'circle_id, member_id, dispute_type (payment_status/suspicious_transaction/missed_payout), reported_status, claimed_status, transaction_ref, flagged_amount, description, proof_url, status (open/under_review/escrow_held/resolved/rejected), escrow_held, escrow_amount', 'Member disputes']} />
          <Row children={['InsuranceClaim', 'circle_id, member_id, claim_type (missed_payout/member_default/fraud/death_hardship/other), amount_claimed, description, evidence_url, status (submitted/under_review/approved/rejected/paid_out), claim_ref, insurer_note, payout_amount', 'GLICO insurance claims']} />
          <Row alt children={['CrossBorderPayout', 'member_id, circle_id, country (UK/US/EU/AUS), gbp_amount, ghs_amount, exchange_rate, compliance_fee_gbp/ghs, bank_account (last 4), recipient_phone, status, fca_reference', 'UK/diaspora cross-border payouts']} />
          <Row children={['Referral', 'circle_id, referrer_id, invitee_email/name, status (pending/joined/rewarded), referrer_bonus_type/value, invitee_bonus_type/value', 'Referral & rewards tracking']} />
        </tbody>
      </table>

      <h3 style={S.h3}>Inventory Entities (Legacy — Sikasem origin)</h3>
      <p style={S.p}>These entities remain from the original Sikasem inventory app. They are not actively used in Qudi screens but remain in the schema: <span style={S.code}>Product</span>, <span style={S.code}>Stock</span>, <span style={S.code}>PurchaseOrder</span>, <span style={S.code}>StockNotification</span>, <span style={S.code}>BarcodeLabel</span>.</p>
      <div style={S.warn}>⚠️ The legacy inventory entities should be reviewed and removed once Qudi goes live if they are not needed.</div>

      {/* 5 */}
      <h2 style={S.h2}>5. All Screens & Pages</h2>
      <table style={S.table}>
        <thead><tr><th style={S.th}>Route</th><th style={S.th}>File</th><th style={S.th}>Description</th><th style={S.th}>Auth?</th></tr></thead>
        <tbody>
          <Row children={['/', 'pages/Splash', 'Animated splash screen. Checks auth → /home or platform login', 'No']} />
          <Row alt children={['/home', 'pages/Home', 'Main dashboard: circle list, summary stats, quick actions, pull-to-refresh', 'Yes']} />
          <Row children={['/circle-detail', 'pages/CircleDetail', 'Circle deep-dive: pot balance, members, collect dues, pay out, penalties, disputes, analytics', 'Yes']} />
          <Row alt children={['/collect-dues', 'pages/CollectDues', 'Live MoMo collection screen with PIN auth, per-member status, real-time counter', 'Yes']} />
          <Row children={['/payout-scheduler', 'pages/PayoutScheduler', 'Manage payout sequence (random/fixed/rotation/bid), trigger next payout', 'Yes']} />
          <Row alt children={['/invitations', 'pages/InviteSystem', 'Generate invite deep links, track invitations, SMS log, guarantor linking', 'Yes']} />
          <Row children={['/member-profile', 'pages/MemberProfile', 'Individual member trust score, payment history, guarantor, KYC status', 'Yes']} />
          <Row alt children={['/member-history', 'pages/MemberContributionHistory', 'Full contribution timeline for a member in a circle', 'Yes']} />
          <Row children={['/payout-roadmap', 'pages/PayoutRoadmap', 'Visual timeline of who gets paid when across all cycles', 'Yes']} />
          <Row alt children={['/penalty-settings', 'pages/PenaltySettings', 'Configure circle penalty rules (flat/percentage/daily), grace period, guarantor notify', 'Yes']} />
          <Row children={['/collection-monitor', 'pages/CollectionMonitor', 'Real-time collection health dashboard across all active circles', 'Yes']} />
          <Row alt children={['/reminders', 'pages/ReminderSchedule', 'Scheduled SMS/in-app reminder management for due contributions', 'Yes']} />
          <Row children={['/cash-flow', 'pages/CashFlowForecast', 'AI-assisted multi-cycle cash flow projections with reliability scoring', 'Yes']} />
          <Row alt children={['/cross-border', 'pages/CrossBorderPayouts', 'UK/diaspora payout management with FCA compliance fee calculation', 'Yes']} />
          <Row children={['/disputes', 'pages/DisputeDashboard', 'All circle disputes: review, escrow-hold, resolve, reject', 'Yes']} />
          <Row alt children={['/insurance', 'pages/InsuranceManagement', 'GLICO insurance claim submission and status tracking', 'Yes']} />
          <Row children={['/referrals', 'pages/ReferralHub', 'Referral tracking and reward management', 'Yes']} />
          <Row alt children={['/penalty-ledger', 'pages/PenaltyLedgerPage', 'Full penalty accounting ledger view', 'Yes']} />
          <Row children={['/guarantor-health', 'pages/GuarantorHealth', 'Guarantor risk scoring and health dashboard', 'Yes']} />
          <Row alt children={['/smart-payout', 'pages/SmartPayoutScheduler', 'AI-assisted payout prioritisation and risk-adjusted scheduling', 'Yes']} />
          <Row children={['/reconciliation', 'pages/ReconciliationPage', 'End-of-cycle reconciliation: compare expected vs actual collections', 'Yes']} />
          <Row alt children={['/register', 'pages/Registration', 'Multi-step onboarding: personal info, KYC (NIA/NIMC/Onfido), OTP, terms', 'No']} />
          <Row children={['/settings', 'pages/Settings', 'Account settings, notifications, delete account, logout', 'Yes']} />
          <Row alt children={['/dashboard (redirect)', '→ /home', 'Legacy redirect for any old /dashboard links', '—']} />
        </tbody>
      </table>

      {/* 6 */}
      <h2 style={S.h2}>6. Screen Flow & Navigation Wiring</h2>

      <h3 style={S.h3}>App Entry Flow</h3>
      <div style={S.flowBox}><span>App loads at <strong>/</strong> (Splash)</span><span style={S.arrow}>→</span><span>isAuthenticated?</span><span style={S.arrow}>YES →</span><span><strong>/home</strong></span><span style={S.arrow}>NO →</span><span>Platform login → returns to <strong>/home</strong></span></div>

      <h3 style={S.h3}>Home → Circle Flow</h3>
      <div style={S.flowBox}><strong>/home</strong><span style={S.arrow}>tap circle card →</span><strong>/circle-detail</strong> (via react-router state: {`{ circle }`})</div>
      <div style={S.flowBox}><strong>/home</strong><span style={S.arrow}>"+ New Circle" →</span><strong>/invitations</strong></div>
      <div style={S.flowBox}><strong>/home</strong><span style={S.arrow}>"📊 Reports" →</span><strong>/cash-flow</strong></div>

      <h3 style={S.h3}>Circle Detail → Sub-screens</h3>
      <div style={S.flowBox}><strong>/circle-detail</strong><span style={S.arrow}>🗺 Roadmap →</span><strong>/payout-roadmap</strong> (state: circle)</div>
      <div style={S.flowBox}><strong>/circle-detail</strong><span style={S.arrow}>Collect dues →</span><strong>/collect-dues</strong></div>
      <div style={S.flowBox}><strong>/circle-detail</strong><span style={S.arrow}>Pay out →</span><strong>/payout-scheduler</strong> (state: circle)</div>
      <div style={S.flowBox}><strong>/circle-detail</strong><span style={S.arrow}>Penalties →</span><strong>/penalty-settings</strong> (state: circle)</div>
      <div style={S.flowBox}><strong>/circle-detail</strong><span style={S.arrow}>+ Invite member →</span><strong>/invitations</strong> (state: circle)</div>
      <div style={S.flowBox}><strong>/circle-detail</strong><span style={S.arrow}>👤 Profile (member) →</span><strong>/member-profile</strong> (state: member, circle)</div>
      <div style={S.flowBox}><strong>/circle-detail</strong><span style={S.arrow}>📋 History (member) →</span><strong>/member-history</strong> (state: member, circle)</div>
      <div style={S.flowBox}><strong>/circle-detail</strong><span style={S.arrow}>🚩 Flag dispute modal → submit →</span><strong>Dispute saved to DB</strong></div>
      <div style={S.flowBox}><strong>/circle-detail</strong><span style={S.arrow}>Tap member (pending) → MarkPaidModal → confirm →</span><strong>Member status updated</strong></div>

      <h3 style={S.h3}>Collection Flow</h3>
      <div style={S.flowBox}><strong>/collect-dues</strong><span style={S.arrow}>"Send requests" →</span>PINConfirm modal<span style={S.arrow}>PIN confirmed →</span>Live collection view (simulated MoMo)</div>
      <div style={S.flowBox}>Collection complete<span style={S.arrow}>→</span><strong>/circle-detail</strong></div>

      <h3 style={S.h3}>Payout Flow</h3>
      <div style={S.flowBox}><strong>/payout-scheduler</strong><span style={S.arrow}>Select circle → view queue →</span>"🚀 Initiate Payout"<span style={S.arrow}>→</span>executeNextPayout() lib<span style={S.arrow}>→</span>DB updated</div>

      <h3 style={S.h3}>NavBar (Bottom Navigation)</h3>
      <table style={S.table}>
        <thead><tr><th style={S.th}>Tab</th><th style={S.th}>Icon</th><th style={S.th}>Route</th></tr></thead>
        <tbody>
          <Row children={['Home', '⌂', '/home']} />
          <Row alt children={['Circles', '◎', '/circle-detail']} />
          <Row children={['Reminders', '🔔', '/reminders']} />
          <Row alt children={['Alerts', '🚨', '/collection-monitor']} />
          <Row children={['More', '···', '/settings']} />
        </tbody>
      </table>
      <p style={S.p}>The NavBar is fixed at the bottom (maxWidth: 430px, centred). Active tab highlighted in <strong>goldText</strong>. All pages include NavBar at the bottom.</p>

      <h3 style={S.h3}>State Passing Between Screens</h3>
      <p style={S.p}>React Router's <span style={S.code}>useLocation().state</span> is used to pass circle/member objects between screens (no URL params). Example:</p>
      <div style={S.codeBlock}>{`// Navigate with state
navigate('/circle-detail', { state: { circle: circleObject } });

// Receive on destination
const { state } = useLocation();
const circle = state?.circle || defaultFallback;`}</div>

      {/* 7 */}
      <h2 style={S.h2}>7. Components Library</h2>
      <table style={S.table}>
        <thead><tr><th style={S.th}>Component</th><th style={S.th}>Path</th><th style={S.th}>Props / Purpose</th></tr></thead>
        <tbody>
          <Row children={['KenteStripe', 'components/qudi/KenteStripe', 'height prop. Decorative 8-colour Kente pattern bar.']} />
          <Row alt children={['NavBar', 'components/qudi/NavBar', 'Bottom navigation. Uses useLocation for active state.']} />
          <Row children={['Header', 'components/qudi/Header', 'dark bool, title, subtitle, onBack. Shows back button if onBack provided.']} />
          <Row alt children={['Avatar', 'components/qudi/Avatar', 'initials, size, bg, color. Circular initials avatar.']} />
          <Row children={['TrustBadge', 'components/qudi/TrustBadge', 'score (0-100). Colour-coded trust score chip.']} />
          <Row alt children={['PINConfirm', 'components/qudi/PINConfirm', 'title, amount, recipient, onConfirm, onCancel. Full-screen PIN entry overlay.']} />
          <Row children={['FraudAlert', 'components/qudi/FraudAlert', 'type, onDismiss. Dismissible fraud warning banner.']} />
          <Row alt children={['DisputeModal', 'components/qudi/DisputeModal', 'member, circle, onClose, onSubmitted. Raise dispute form sheet.']} />
          <Row children={['MarkPaidModal', 'components/qudi/MarkPaidModal', 'member, circle, onClose, onSuccess. Confirm manual payment marking.']} />
          <Row alt children={['PenaltyBanner', 'components/qudi/PenaltyBanner', 'circle, member, daysLate. Shows penalty warning for overdue members.']} />
          <Row children={['ReminderButton', 'components/qudi/ReminderButton', 'members[], circle. Bulk reminder send trigger.']} />
          <Row alt children={['PayoutSchedule', 'components/qudi/PayoutSchedule', 'members[], circle. Visual upcoming payout sequence.']} />
          <Row children={['CircleAnalytics', 'components/qudi/CircleAnalytics', 'circle. Mini analytics charts for a circle.']} />
          <Row alt children={['CircleSummaryPDF', 'components/qudi/CircleSummaryPDF', 'circle, members[]. Generates + downloads a jsPDF summary.']} />
          <Row children={['BottomSheet', 'components/BottomSheet', 'open, onClose, options[], value, onChange, title. Mobile-optimised option picker.']} />
          <Row alt children={['OfflineSyncBanner', 'components/OfflineSyncBanner', 'No props. Shows offline/sync status using useOfflineSync hook.']} />
        </tbody>
      </table>

      {/* 8 */}
      <h2 style={S.h2}>8. Backend Functions</h2>
      <p style={S.p}>All backend functions live in the <span style={S.code}>functions/</span> folder. They run as Deno Deploy serverless handlers. Called from frontend via:</p>
      <div style={S.codeBlock}>{`import { base44 } from "@/api/base44Client";
const response = await base44.functions.invoke('functionName', { param: value });
// response.data contains the returned payload`}</div>
      <table style={S.table}>
        <thead><tr><th style={S.th}>Function</th><th style={S.th}>Purpose</th><th style={S.th}>Auth</th></tr></thead>
        <tbody>
          <Row children={['generatePurchaseOrders', 'Auto-generate purchase orders for low-stock products', 'Admin']} />
          <Row alt children={['checkStockLevels', 'Check all stock levels and create StockNotification records', 'Admin']} />
          <Row children={['notifyStockoutRisk', 'Sends notifications for products approaching stockout', 'Admin']} />
          <Row alt children={['generateStockPredictions', 'AI-based stock forecasting using transaction history', 'Admin']} />
          <Row children={['flagLowStockProducts', 'Flags products below reorder level', 'Admin']} />
          <Row alt children={['exportInventory', 'Returns CSV of current inventory', 'Admin']} />
          <Row children={['exportTransactions', 'Returns CSV of all transactions', 'Admin']} />
          <Row alt children={['predictStockLevels', 'Machine learning-style stock level predictions', 'Admin']} />
          <Row children={['syncAuditToGitHub', 'Pushes audit log data to GitHub repo', 'Admin + GitHub connector']} />
          <Row alt children={['pushAuditToGitHub', 'Pushes specific audit entries to GitHub', 'Admin + GitHub connector']} />
          <Row children={['getFileContent', 'Reads file content from GitHub repo', 'GitHub connector']} />
          <Row alt children={['listRepoFiles', 'Lists files in a GitHub repo', 'GitHub connector']} />
          <Row children={['getGitHubIssues', 'Fetches issues from a GitHub repo', 'GitHub connector']} />
        </tbody>
      </table>
      <div style={S.info}>ℹ️ Most backend functions were built for the legacy Sikasem inventory app. Qudi-specific backend functions (MoMo integration, SMS, KYC) are not yet implemented — currently simulated in the frontend.</div>

      {/* 9 */}
      <h2 style={S.h2}>9. Integrations & SDK</h2>
      <h3 style={S.h3}>Base44 Core Integrations (built-in)</h3>
      <table style={S.table}>
        <thead><tr><th style={S.th}>Integration</th><th style={S.th}>Usage in Qudi</th></tr></thead>
        <tbody>
          <Row children={['InvokeLLM', 'Cash flow forecasting (CashFlowForecast), stock predictions. Uses gemini_3_flash for web context.']} />
          <Row alt children={['SendEmail', 'Available for notifications — not yet wired to Qudi member emails.']} />
          <Row children={['UploadFile', 'Used in insurance claim evidence upload (InsuranceManagement).']} />
          <Row alt children={['GenerateImage', 'Available but not currently used.']} />
          <Row children={['ExtractDataFromUploadedFile', 'Available but not currently used.']} />
        </tbody>
      </table>
      <div style={S.codeBlock}>{`// Example: InvokeLLM for cash flow
import { base44 } from "@/api/base44Client";
const result = await base44.integrations.Core.InvokeLLM({
  prompt: "Analyse these circle transactions and forecast collection rates...",
  response_json_schema: { type: "object", properties: { forecast: { type: "array" } } }
});`}</div>

      <h3 style={S.h3}>GitHub App User Connector</h3>
      <table style={S.table}>
        <thead><tr><th style={S.th}>Attribute</th><th style={S.th}>Value</th></tr></thead>
        <tbody>
          <Row children={['Connector Name', 'qudi-app']} />
          <Row alt children={['Connector ID', '69d33066bb1428bbeeb208b4']} />
          <Row children={['Type', 'App User Connector (each user connects their own GitHub)']} />
          <Row alt children={['Purpose', 'Audit log sync, file browsing, issue tracking to GitHub']} />
          <Row children={['Backend usage', "base44.asServiceRole.connectors.getCurrentAppUserAccessToken('69d33066bb1428bbeeb208b4')"]} />
        </tbody>
      </table>

      <h3 style={S.h3}>Planned Integrations (Not Yet Implemented)</h3>
      <table style={S.table}>
        <thead><tr><th style={S.th}>Integration</th><th style={S.th}>Purpose</th><th style={S.th}>Provider</th></tr></thead>
        <tbody>
          <Row children={['Mobile Money', 'Real MoMo collection & payout', 'MTN MoMo API / Hubtel']} />
          <Row alt children={['SMS', 'Member reminders, OTP, invite SMS', 'Twilio / Arkesel (Ghana)']} />
          <Row children={['KYC', 'Ghana Card NIA verification, Onfido for UK', 'NIA API / Onfido']} />
          <Row alt children={['Insurance', 'GLICO claim submission API', 'GLICO Ghana']} />
          <Row children={['FCA Compliance', 'UK cross-border payout compliance', 'FCA-registered payment processor']} />
          <Row alt children={['Push Notifications', 'Mobile push for reminders', 'Firebase FCM']} />
        </tbody>
      </table>

      {/* 10 */}
      <h2 style={S.h2}>10. Automations</h2>
      <p style={S.p}>Automations are configured in the Base44 dashboard. Current automations are legacy Sikasem inventory ones. No Qudi-specific automations have been set up yet.</p>
      <h3 style={S.h3}>Recommended Qudi Automations to Build</h3>
      <table style={S.table}>
        <thead><tr><th style={S.th}>Automation</th><th style={S.th}>Type</th><th style={S.th}>Trigger</th><th style={S.th}>Action</th></tr></thead>
        <tbody>
          <Row children={['Due Date Reminders', 'Scheduled', 'Daily 8am', 'Check upcoming dues, send SMS reminders']} />
          <Row alt children={['Penalty Auto-Apply', 'Entity', 'Transaction overdue N days', 'Create Penalty record, notify guarantor']} />
          <Row children={['Circle Completion', 'Entity', 'Member.has_received_payout updated', 'Check if all paid, mark Circle as completed']} />
          <Row alt children={['Invitation Expiry', 'Scheduled', 'Daily', 'Mark expired invitations (expires_at passed)']} />
        </tbody>
      </table>

      {/* 11 */}
      <h2 style={S.h2}>11. Auth & User Management</h2>
      <p style={S.p}>Authentication is fully managed by the Base44 platform. There is no custom login page.</p>
      <table style={S.table}>
        <thead><tr><th style={S.th}>SDK Method</th><th style={S.th}>Usage</th></tr></thead>
        <tbody>
          <Row children={['base44.auth.me()', 'Get current logged-in user object (id, email, full_name, role)']} />
          <Row alt children={['base44.auth.isAuthenticated()', 'Returns Promise<boolean> — used in Splash']} />
          <Row children={['base44.auth.redirectToLogin(nextUrl)', 'Redirects to platform login, returns to nextUrl after success']} />
          <Row alt children={['base44.auth.logout(redirectUrl)', 'Logs out, redirects to provided URL']} />
          <Row children={['base44.auth.updateMe(data)', 'Update current user profile data']} />
        </tbody>
      </table>
      <p style={S.p}><strong>User roles:</strong> <span style={S.badge}>admin</span><span style={S.badge}>user</span> — admin can access admin-only functions. Regular users get standard access.</p>
      <div style={S.tip}>🔐 In Splash.jsx: on auth check, unauthenticated users are sent to <code>base44.auth.redirectToLogin('/home')</code> so they return to the home screen after logging in.</div>

      {/* 12 */}
      <h2 style={S.h2}>12. Mobile / WebView Configuration</h2>
      <p style={S.p}>The app is optimised for native mobile WebView embedding. Key configurations:</p>
      <table style={S.table}>
        <thead><tr><th style={S.th}>Config</th><th style={S.th}>Location</th><th style={S.th}>Detail</th></tr></thead>
        <tbody>
          <Row children={['Overscroll disable', 'index.css', 'html, body { overscroll-behavior: none }']} />
          <Row alt children={['Safe area insets', 'index.css + components', '.safe-area-top/bottom using env(safe-area-inset-*)']} />
          <Row children={['Tap highlight removal', 'index.css', '-webkit-tap-highlight-color: transparent on interactive elements']} />
          <Row alt children={['User select disable', 'index.css', 'user-select: none on buttons/links/tabs']} />
          <Row children={['Viewport', 'index.html', 'viewport meta with width=device-width, initial-scale=1']} />
          <Row alt children={['Max width', 'All pages', 'maxWidth: 430px, margin: 0 auto — standard mobile frame']} />
          <Row children={['Page transitions', 'App.jsx PageSlide', 'Framer Motion slide-in from right, slide-out to left']} />
          <Row alt children={['Pull to refresh', 'hooks/usePullToRefresh.js', 'Custom hook on Home page']} />
          <Row children={['Dark mode', 'index.css', '@media (prefers-color-scheme: dark) overrides all CSS vars']} />
          <Row alt children={['Bottom sheet', 'components/BottomSheet', 'Mobile-optimised Framer Motion sheet for form selections']} />
        </tbody>
      </table>

      {/* 13 */}
      <h2 style={S.h2}>13. Key Business Logic Libraries</h2>
      <table style={S.table}>
        <thead><tr><th style={S.th}>Library</th><th style={S.th}>Path</th><th style={S.th}>What it does</th></tr></thead>
        <tbody>
          <Row children={['qudiTokens', 'lib/qudiTokens.js', 'All design colour tokens exported as C object']} />
          <Row alt children={['trustScore', 'lib/trustScore.js', 'enrichMembersWithTrust() — computes trust_delta and trust_reason per member based on payment history']} />
          <Row children={['payoutScheduler', 'lib/payoutScheduler.js', 'buildPayoutSequence(circle, members, bids) — returns ordered payout queue. executeNextPayout() — marks payout, updates member + circle in DB']} />
          <Row alt children={['penaltyEngine', 'lib/penaltyEngine.js', 'Calculates penalty amounts based on circle penalty config (flat/percentage/daily_interest)']} />
          <Row children={['reminderScheduler', 'lib/reminderScheduler.js', 'Generates reminder schedule objects based on circle frequency and due dates']} />
          <Row alt children={['collectionMonitor', 'lib/collectionMonitor.js', 'Aggregates collection health metrics across circles']} />
          <Row children={['guarantorHealthEngine', 'lib/guarantorHealthEngine.js', 'Scores guarantor risk based on their linked members\' payment patterns']} />
          <Row alt children={['smartPayoutEngine', 'lib/smartPayoutEngine.js', 'AI-assisted payout prioritisation with risk adjustment']} />
          <Row children={['reconciliationEngine', 'lib/reconciliationEngine.js', 'Compares expected vs actual collections for a cycle']} />
          <Row alt children={['referralEngine', 'lib/referralEngine.js', 'Handles referral reward calculations and bonus assignments']} />
          <Row children={['currencyConverter', 'lib/currencyConverter.js', 'GBP→GHS conversion with exchange rates and FCA compliance fees per diaspora country']} />
          <Row alt children={['fraudDetection', 'lib/fraudDetection.js', 'Flags suspicious transactions, wallet mismatches, SIM-swap risk']} />
          <Row children={['rateLimiter', 'lib/rateLimiter.js', 'Rate limiting for PIN verification, payout submission, cross-border payouts']} />
          <Row alt children={['validation', 'lib/validation.js', 'Phone, email, amount, PIN, bank account, full name validators']} />
          <Row children={['auditLog', 'lib/auditLog.js', 'Creates audit trail entries for sensitive operations']} />
          <Row alt children={['roleGuard', 'lib/roleGuard.js', 'Role-based access guard helpers']} />
          <Row children={['payoutDistributionEngine', 'lib/payoutDistributionEngine.js', 'Handles complex multi-member payout distribution scenarios']} />
        </tbody>
      </table>

      <h3 style={S.h3}>Trust Score System</h3>
      <p style={S.p}>Each member has a <strong>trust_score (0-100)</strong>. The <span style={S.code}>enrichMembersWithTrust()</span> function computes per-cycle deltas:</p>
      <table style={S.table}>
        <thead><tr><th style={S.th}>Payment Status</th><th style={S.th}>Trust Delta</th><th style={S.th}>Reason</th></tr></thead>
        <tbody>
          <Row children={['paid', '+5', 'On-time payment']} />
          <Row alt children={['pending', '0', 'Not yet due']} />
          <Row children={['failed', '-10', 'Payment failed']} />
          <Row alt children={['overdue', '-15', 'Payment overdue']} />
        </tbody>
      </table>

      {/* 14 */}
      <h2 style={S.h2}>14. GitHub Connector</h2>
      <p style={S.p}>A GitHub App User Connector is registered to allow syncing audit logs and accessing code repositories from within the app.</p>
      <div style={S.codeBlock}>{`// Frontend: connect user to GitHub
const url = await base44.connectors.connectAppUser("69d33066bb1428bbeeb208b4");
window.open(url, "_blank");

// Backend function: get GitHub access token for current user
const accessToken = await base44.asServiceRole.connectors
  .getCurrentAppUserAccessToken("69d33066bb1428bbeeb208b4");

// Use in GitHub API calls
const res = await fetch("https://api.github.com/repos/owner/repo/contents", {
  headers: { Authorization: \`Bearer \${accessToken}\` }
});`}</div>
      <p style={S.p}>Backend functions using GitHub: <span style={S.code}>syncAuditToGitHub</span>, <span style={S.code}>pushAuditToGitHub</span>, <span style={S.code}>getFileContent</span>, <span style={S.code}>listRepoFiles</span>, <span style={S.code}>getGitHubIssues</span>.</p>

      {/* 15 */}
      <h2 style={S.h2}>15. Known Gaps & Next Steps</h2>
      <div style={S.warn}>🔴 <strong>Critical — Not yet implemented (simulated only):</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>Real MTN MoMo API integration (collections and payouts currently simulated)</li>
          <li>Real SMS sending (Arkesel/Twilio) — SMS messages are logged locally only</li>
          <li>Real NIA/NIMC/Onfido KYC — currently a simulated 2-second scan</li>
          <li>Real OTP verification — no actual SMS sent on Registration step 3</li>
          <li>GLICO insurance API — claims saved to DB but not submitted to insurer</li>
          <li>FCA cross-border payout processor — amounts calculated but not transacted</li>
        </ul>
      </div>
      <div style={S.tip}>🟡 <strong>Recommended improvements:</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>Remove/archive legacy Sikasem inventory entities and backend functions</li>
          <li>Add Qudi-specific scheduled automations (reminders, penalty auto-apply)</li>
          <li>Wire InvokeLLM properly in CashFlowForecast (currently uses local calculation)</li>
          <li>Add real push notifications (Firebase FCM) for mobile WebView</li>
          <li>Set up production Circle creation flow (currently circles are demo data on Home)</li>
          <li>Add admin dashboard for organiser circle management and reporting</li>
          <li>Implement deep link handling for invite codes (/register?invite=CODE)</li>
          <li>Add biometric auth (Touch ID / Face ID) via WebView bridge</li>
        </ul>
      </div>
      <div style={S.info}>🔵 <strong>File structure reminder:</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li><span style={S.code}>pages/</span> — All screen components (one file per screen)</li>
          <li><span style={S.code}>components/qudi/</span> — Qudi-specific reusable components</li>
          <li><span style={S.code}>components/ui/</span> — shadcn/ui base components (do not modify)</li>
          <li><span style={S.code}>lib/</span> — Business logic, tokens, utilities, hooks</li>
          <li><span style={S.code}>hooks/</span> — Custom React hooks</li>
          <li><span style={S.code}>functions/</span> — Deno backend function handlers</li>
          <li><span style={S.code}>entities/</span> — JSON schema definitions for all data models</li>
          <li><span style={S.code}>api/base44Client.js</span> — Pre-initialised Base44 SDK client</li>
        </ul>
      </div>

      <div style={S.divider} />
      <div style={{ textAlign: 'center', color: '#6B5A3A', fontSize: 12, paddingBottom: 32 }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>🫂</div>
        <strong>Qudi — Money Circles, Built on Trust</strong><br />
        Agency Handover Document · Generated April 2026<br />
        Built on Base44 Platform · React + Deno + Base44 SDK
      </div>
    </div>
  );
}