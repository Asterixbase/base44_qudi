import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { C } from '../lib/qudiTokens';
import KenteStripe from '../components/qudi/KenteStripe';
import Header from '../components/qudi/Header';
import Avatar from '../components/qudi/Avatar';
import TrustBadge from '../components/qudi/TrustBadge';
import FraudAlert from '../components/qudi/FraudAlert';
import CircleAnalytics from '../components/qudi/CircleAnalytics';
import ReminderButton from '../components/qudi/ReminderButton';
import MarkPaidModal from '../components/qudi/MarkPaidModal';
import PayoutSchedule from '../components/qudi/PayoutSchedule';
import NavBar from '../components/qudi/NavBar';
import { enrichMembersWithTrust } from '../lib/trustScore';
import CircleSummaryPDF from '../components/qudi/CircleSummaryPDF';
import DisputeModal from '../components/qudi/DisputeModal';
import PenaltyBanner from '../components/qudi/PenaltyBanner';

const DEMO_MEMBERS = [
  { id: 'm1', initials: 'AA', full_name: 'Akosua Asante', payout_position: 1, payment_status: 'paid',    trust_score: 92, is_verified: true },
  { id: 'm2', initials: 'KM', full_name: 'Kofi Mensah',   payout_position: 2, payment_status: 'paid',    trust_score: 88, is_verified: true },
  { id: 'm3', initials: 'YD', full_name: 'Yaw Darko',     payout_position: 3, payment_status: 'paid',    trust_score: 85, is_verified: true },
  { id: 'm4', initials: 'AO', full_name: 'Ama Osei',      payout_position: 4, payment_status: 'failed',  trust_score: 62, is_verified: true },
  { id: 'm5', initials: 'KB', full_name: 'Kwame Boateng', payout_position: 5, payment_status: 'pending', trust_score: 45, is_verified: false },
];

const STATUS_STYLE = {
  paid:    { bg: '#D4EDDA', color: '#155724', label: 'PAID' },
  pending: { bg: '#FFF8E1', color: '#856404', label: 'PENDING' },
  failed:  { bg: '#FCE4E4', color: '#721C24', label: 'FAILED' },
  overdue: { bg: '#FCE4E4', color: '#721C24', label: 'OVERDUE' },
};

export default function CircleDetail() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const circle = state?.circle || {
    name: 'Kantamanto Traders', meta: 'Cycle 3 · Monthly · 10 members',
    contribution_amount: 200, pot_balance: 1400, max_members: 10, current_cycle: 3, is_insured: true,
  };
  const [showFraud, setShowFraud] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberStatuses, setMemberStatuses] = useState({});
  const [memberTrustOverrides, setMemberTrustOverrides] = useState({});
  const [disputeMember, setDisputeMember] = useState(null);

  const getMemberStatus = (m) => memberStatuses[m.id] || m.payment_status;

  // Enrich all members with computed trust scores based on payment status
  const enrichedMembers = enrichMembersWithTrust(
    DEMO_MEMBERS.map(m => ({
      ...m,
      payment_status: getMemberStatus(m),
      trust_score: memberTrustOverrides[m.id] ?? m.trust_score,
    }))
  );

  const paid = enrichedMembers.filter(m => m.payment_status === 'paid').length;
  const potProgress = Math.round((paid / DEMO_MEMBERS.length) * 100);

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* Dark header */}
      <div style={{ background: C.ink }}>
        <Header
          dark
          title={circle.name}
          subtitle={`GHS ${circle.contribution_amount || 200} · ${circle.frequency || 'Monthly'} · ${circle.max_members || 10} members`}
          onBack={() => navigate('/dashboard')}
        />
        <KenteStripe height={3} />
        {/* Pot card */}
        <div style={{ padding: '16px 16px 20px' }}>
          <div style={{ color: C.hintOnDark, fontSize: 12, marginBottom: 4 }}>Pot balance (in escrow)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.gold, fontSize: 28, fontWeight: 800 }}>
              GHS {circle.pot_balance || 1400}
            </div>
            <span style={{ background: C.tealBg, color: C.tealTx, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>Protected</span>
          </div>
          <div style={{ color: C.hintOnDark, fontSize: 12, marginBottom: 10 }}>
            {paid} of {DEMO_MEMBERS.length} paid this cycle
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: C.gold, width: `${potProgress}%`, borderRadius: 3 }} />
          </div>
          <div style={{ color: C.hintOnDark, fontSize: 11, marginTop: 8 }}>
            Funds held in Qudi escrow — never in organiser's wallet
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 70 }}>
        {/* Fraud alert */}
        {showFraud && (
          <div style={{ marginTop: 12 }}>
            <FraudAlert type="walletMismatch" onDismiss={() => setShowFraud(false)} />
          </div>
        )}

        {/* Recipient */}
        <div style={{ margin: '12px 16px', background: C.white, borderRadius: 12, padding: '14px', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, fontWeight: 600 }}>THIS CYCLE'S RECIPIENT</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar initials="YD" size={44} bg={C.goldText} color={C.white} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>Yaw Darko</div>
              <div style={{ fontSize: 13, color: C.muted }}>Position #3 · Receives GHS 1,960</div>
            </div>
            <TrustBadge score={85} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, padding: '0 16px', marginBottom: 16 }}>
          <Link to="/payout-roadmap" state={{ circle }} style={{
            flex: 1, background: C.blueBg, color: C.blue, border: `0.5px solid ${C.blue}`,
            borderRadius: 10, padding: '12px', textAlign: 'center', fontWeight: 700, fontSize: 13, textDecoration: 'none',
          }}>🗺 Roadmap</Link>
          <Link to="/collect-dues" style={{
            flex: 1, background: C.gold, color: C.ink, border: 'none', borderRadius: 10,
            padding: '12px', textAlign: 'center', fontWeight: 700, fontSize: 13, textDecoration: 'none',
          }}>Collect dues</Link>
          <Link to="/payout-scheduler" state={{ circle }} style={{
            flex: 1, background: C.ink, color: C.cream, border: 'none', borderRadius: 10,
            padding: '12px', textAlign: 'center', fontWeight: 700, fontSize: 13, textDecoration: 'none',
          }}>Pay out</Link>
          <Link to="/penalty-settings" state={{ circle }} style={{
            flex: 1, background: C.tealBg, color: C.tealTx, border: `0.5px solid ${C.teal}`,
            borderRadius: 10, padding: '12px', textAlign: 'center', fontWeight: 700, fontSize: 13, textDecoration: 'none',
          }}>Penalties</Link>
        </div>

        {/* Penalty banners for overdue/failed members */}
        {enrichedMembers.filter(m => ['failed','overdue'].includes(getMemberStatus(m))).map(m => (
          <div key={m.id} style={{ padding: '0 16px' }}>
            <PenaltyBanner circle={circle} member={{ ...m, payment_status: getMemberStatus(m) }} daysLate={2} />
          </div>
        ))}

        {/* Reminders */}
        <ReminderButton members={DEMO_MEMBERS} circle={circle} />

        {/* Payout Schedule */}
        <PayoutSchedule members={DEMO_MEMBERS} circle={circle} />

        {/* Analytics */}
        <CircleAnalytics circle={circle} />

        {/* Members */}
        <div style={{ padding: '0 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>Members</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <CircleSummaryPDF circle={circle} members={enrichedMembers} />
              <Link to="/invitations" state={{ circle }} style={{ background: 'none', border: 'none', color: C.goldText, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>+ Invite member</Link>
            </div>
          </div>
          {enrichedMembers.map(m => {
            const status = m.payment_status;
            const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
            const canMark = status === 'pending' || status === 'overdue' || status === 'failed';
            const deltaColor = m.trust_delta > 0 ? C.green : m.trust_delta < 0 ? C.red : C.muted;
            const deltaLabel = m.trust_delta > 0 ? `+${m.trust_delta}` : `${m.trust_delta}`;
            return (
              <div key={m.id} style={{
                background: C.white, borderRadius: 10, padding: '10px 12px',
                marginBottom: 6, border: `0.5px solid ${status === 'failed' ? C.red : C.border}`,
                display: 'flex', alignItems: 'center', gap: 10, cursor: canMark ? 'pointer' : 'default',
              }}
                onClick={() => canMark && setSelectedMember(m)}
              >
                <div style={{ color: C.hint, fontSize: 12, fontWeight: 600, width: 16, textAlign: 'center' }}>#{m.payout_position}</div>
                <Avatar initials={m.initials} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{m.full_name}</span>
                    {m.is_verified && <span style={{ color: C.teal, fontSize: 13 }}>✓</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <TrustBadge score={m.trust_score} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: deltaColor }}>{deltaLabel} this cycle</span>
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{m.trust_reason}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ background: s.bg, color: s.color, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>{s.label}</span>
                  {canMark && <span style={{ fontSize: 10, color: C.goldText, fontWeight: 600 }}>Tap to mark paid</span>}
                  <button
                    onClick={e => { e.stopPropagation(); setDisputeMember(m); }}
                    style={{ background: 'none', border: 'none', fontSize: 10, color: C.red, fontWeight: 600, cursor: 'pointer', padding: 0, marginTop: 2 }}
                  >🚩 Flag</button>
                  <Link
                    to="/member-profile"
                    state={{ member: m, circle }}
                    onClick={e => e.stopPropagation()}
                    style={{ fontSize: 10, color: C.blue || C.goldText, fontWeight: 600, textDecoration: 'none' }}
                  >👤 Profile</Link>
                  <Link
                    to="/member-history"
                    state={{ member: m, circle }}
                    onClick={e => e.stopPropagation()}
                    style={{ fontSize: 10, color: C.goldText, fontWeight: 600, textDecoration: 'none' }}
                  >📋 History</Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {disputeMember && (
        <DisputeModal
          member={disputeMember}
          circle={circle}
          onClose={() => setDisputeMember(null)}
          onSubmitted={() => setDisputeMember(null)}
        />
      )}

      {selectedMember && (
        <MarkPaidModal
          member={selectedMember}
          circle={circle}
          onClose={() => setSelectedMember(null)}
          onSuccess={(id) => {
            setMemberStatuses(s => ({ ...s, [id]: 'paid' }));
            const base = DEMO_MEMBERS.find(m => m.id === id)?.trust_score ?? 50;
            setMemberTrustOverrides(t => ({ ...t, [id]: Math.min(100, base + 8) }));
          }}
        />
      )}

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430 }}>
        <NavBar />
      </div>
    </div>
  );
}