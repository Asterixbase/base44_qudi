import { useNavigate } from 'react-router-dom';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';

export default function ArchitectureOverview() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.ink }}>
        <Header dark title="Architecture Overview" subtitle="System flows & process documentation" onBack={() => navigate('/dashboard')} />
        <KenteStripe height={3} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 90 }}>
        {/* System Overview */}
        <Section title="System Architecture">
          <Property label="Frontend" value="React 18 + Tailwind + Shadcn/UI" />
          <Property label="Backend" value="Base44 SDK (BaaS)" />
          <Property label="Database" value="12 Entity types" />
          <Property label="Auth" value="OAuth 2.0" />
          <Property label="Integrations" value="LLM, Email, SMS, Files" />
        </Section>

        {/* Key Stats */}
        <Section title="Key Stats">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <StatCard label="Screens" value="25" />
            <StatCard label="Entities" value="12" />
            <StatCard label="Admin Dashboards" value="7" />
            <StatCard label="Member Dashboards" value="8" />
          </div>
        </Section>

        {/* Onboarding Flow */}
        <Section title="1. Member Onboarding">
          <Flow steps={['Splash', 'Register', 'KYC', 'Phone', 'Terms', 'Dashboard']} />
          <p style={{ fontSize: 12, color: C.muted, marginTop: 12 }}>User created, KYC verified, ready to join circles</p>
        </Section>

        {/* Collection Cycle */}
        <Section title="2. Collection → Payout Cycle">
          <Timeline items={[
            { title: 'Collection Phase', desc: 'Organiser → Collect Dues → PIN confirm → MoMo requests' },
            { title: 'Monitoring', desc: 'Auto-check 30s, 70% threshold, Urgency Blast alerts' },
            { title: 'Smart Gate', desc: '80% collection threshold validation before payout' },
            { title: 'Payout', desc: 'Recipient selection, penalty deductions, security checks' },
            { title: 'Reconciliation', desc: 'MoMo matching, discrepancy alerts, settlement' },
          ]} />
        </Section>

        {/* Risk Management */}
        <Section title="3. Risk Management">
          <Card title="Trust Score" desc="Base (payment rate × 80) + 10 KYC + penalties" />
          <Card title="Penalties" desc="Auto-trigger on overdue, types: flat/percentage/daily" />
          <Card title="Guarantor Health" desc="Aggregated risk scores, high-risk flagging (Admin only)" />
        </Section>

        {/* Disputes & Insurance */}
        <Section title="4. Disputes & Insurance">
          <Card title="Dispute Flow" desc="Open → Review → Escrow Hold → Resolution" />
          <Card title="Insurance" desc="Claims: missed payout / fraud / hardship → approval → payout" />
        </Section>

        {/* Cross-Border */}
        <Section title="5. Cross-Border Payouts (NEW)">
          <Flow steps={['Select Country', 'Amount (GBP)', 'Convert to GHS', 'FCA Fee', 'Review', 'Submit']} />
          <Property label="UK Rate" value="£1 = GHS 11.5" />
          <Property label="US Rate" value="$1 = GHS 15.2" />
          <Property label="FCA Fee" value="Flat + 1%, max £25" />
        </Section>

        {/* Dashboards */}
        <Section title="6. Dashboards">
          <SubSection title="Admin (7)" items={[
            'Admin Dashboard - KPIs & trends',
            'Cash Flow Forecast - Risk projections',
            'Guarantor Health - Risk analysis',
            'Payout Roadmap - Schedule',
            'Penalty Ledger - Settlement',
            'Auto Penalty Scanner - Overdue detection',
            'Reconciliation - MoMo matching',
          ]} />
          <SubSection title="Member (8)" items={[
            'Dashboard - Circles & alerts',
            'Circle Detail - Pot & members',
            'Member Profile - Analytics',
            'My Payouts - Schedule & history',
            'Referral Hub - Invites',
            'Cross-Border - Transfers',
            'Dispute Dashboard - Report issues',
            'Member History - Contributions',
          ]} />
        </Section>

        {/* Monitoring */}
        <Section title="7. Real-Time Monitoring">
          <Card title="Collection Monitor" desc="30s refresh, &lt;70% alerts, Urgency Blast" />
          <Card title="Reminder Scheduler" desc="3-day → 1-day → due, bulk SMS automation" />
        </Section>

        {/* Security */}
        <Section title="8. Security & Access">
          <Property label="Auth" value="OAuth 2.0 + Base44 AuthProvider" />
          <Property label="Admin Guard" value="checkAdminRole() on sensitive pages" />
          <Property label="PIN Auth" value="Required for collection & payouts" />
          <Property label="KYC" value="Verification flag for payout eligibility" />
          <Property label="Escrow" value="Funds locked during dispute resolution" />
          <Property label="FCA Compliance" value="Regulated cross-border transfers" />
        </Section>

        <div style={{ textAlign: 'center', marginTop: 40, marginBottom: 20, color: C.muted, fontSize: 12 }}>
          <p>📊 Qudi Architecture • React 18 + Tailwind + Base44</p>
          <p style={{ marginTop: 8, fontSize: 11 }}>View full HTML at ARCHITECTURE_OVERVIEW.html</p>
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430 }}>
        <NavBar />
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: C.white, borderRadius: 12, padding: '16px', marginBottom: 14, border: `1px solid ${C.border}` }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 12, textTransform: 'uppercase' }}>{title}</h2>
      {children}
    </div>
  );
}

function Property({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}`, marginBottom: 8 }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span style={{ color: C.ink, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: C.cream, borderRadius: 10, padding: '12px', textAlign: 'center', border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.goldText }}>{value}</div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Flow({ steps }) {
  return (
    <div style={{ background: C.cream, borderRadius: 8, padding: 12, overflow: 'auto', marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 6, whiteSpace: 'nowrap' }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ background: C.gold, color: C.ink, padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{step}</div>
            {i < steps.length - 1 && <span style={{ color: C.border }}>→</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Timeline({ items }) {
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ paddingLeft: 16, paddingBottom: 12, borderLeft: i < items.length - 1 ? `2px solid ${C.border}` : 'none', marginLeft: 8 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{item.title}</h3>
          <p style={{ fontSize: 11, color: C.muted }}>{item.desc}</p>
        </div>
      ))}
    </div>
  );
}

function Card({ title, desc }) {
  return (
    <div style={{ background: C.cream, borderRadius: 8, padding: '10px 12px', marginBottom: 8, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{title}</div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{desc}</div>
    </div>
  );
}

function SubSection({ title, items }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3 style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 8 }}>{title}</h3>
      <ul style={{ fontSize: 11, color: C.muted, lineHeight: 1.8, paddingLeft: 20 }}>
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
}