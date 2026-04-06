import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import TrustBadge from '../components/qudi/TrustBadge';
import Avatar from '../components/qudi/Avatar';
import NavBar from '../components/qudi/NavBar';

const STATUS_STYLE = {
  paid:    { bg: '#D4EDDA', color: '#155724', label: 'Paid',    icon: '✅' },
  pending: { bg: '#FFF8E1', color: '#856404', label: 'Pending', icon: '⏳' },
  failed:  { bg: '#FCE4E4', color: '#721C24', label: 'Failed',  icon: '❌' },
  overdue: { bg: '#FCE4E4', color: '#721C24', label: 'Overdue', icon: '🔴' },
};

export default function MemberContributionHistory() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const member = state?.member;
  const circle = state?.circle;

  const [transactions, setTransactions] = useState([]);
  const [penalties, setPenalties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!member || !circle) { setLoading(false); return; }
    Promise.all([
      base44.entities.Transaction.filter({ circle_id: circle.id, member_id: member.id }),
      base44.entities.PenaltyLedger.filter({ circle_id: circle.id, member_id: member.id }),
    ]).then(([txns, pens]) => {
      setTransactions(txns.sort((a, b) => b.cycle - a.cycle));
      setPenalties(pens);
      setLoading(false);
    });
  }, []);

  if (!member || !circle) {
    return (
      <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: C.muted }}>No member data provided.</div>
      </div>
    );
  }

  const collections = transactions.filter(t => t.type === 'collection');
  const totalPaid = collections.filter(t => t.status === 'success').reduce((s, t) => s + (t.amount || 0), 0);
  const currentCycle = circle.current_cycle || 1;
  const contribution = circle.contribution_amount || 0;
  const currentStatus = member.payment_status || 'pending';
  const outstandingPenalties = penalties
    .filter(p => p.settlement_status === 'outstanding')
    .reduce((s, p) => s + (p.penalty_amount || 0), 0);
  const upcomingDue = currentStatus !== 'paid' ? contribution + outstandingPenalties : outstandingPenalties;

  // Build timeline: one entry per cycle
  const maxCycle = Math.max(currentCycle, ...collections.map(t => t.cycle || 1), 1);
  const timeline = [];
  for (let c = maxCycle; c >= 1; c--) {
    const txn = collections.find(t => t.cycle === c);
    const penalty = penalties.find(p => p.cycle === c);
    timeline.push({ cycle: c, txn, penalty, isCurrent: c === currentCycle });
  }

  const s = STATUS_STYLE[currentStatus] || STATUS_STYLE.pending;

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: C.ink }}>
        <Header dark title="Contribution History" subtitle={circle.name} onBack={() => navigate(-1)} />
        <KenteStripe height={3} />

        {/* Member card */}
        <div style={{ padding: '14px 16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar initials={member.initials || member.full_name?.slice(0,2).toUpperCase()} size={48} bg={C.goldText} color={C.white} />
          <div style={{ flex: 1 }}>
            <div style={{ color: C.cream, fontWeight: 700, fontSize: 16 }}>{member.full_name}</div>
            <div style={{ color: C.hintOnDark, fontSize: 12, marginTop: 2 }}>
              Position #{member.payout_position || '—'} · {circle.frequency || 'Monthly'}
            </div>
            <div style={{ marginTop: 6 }}>
              <TrustBadge score={member.trust_score || 50} />
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ background: s.bg, color: s.color, borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
              {s.icon} {s.label}
            </div>
            <div style={{ color: C.hintOnDark, fontSize: 11, marginTop: 4 }}>Cycle {currentCycle}</div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '14px 16px 8px' }}>
        {[
          { label: 'Total Paid', value: `GHS ${totalPaid.toLocaleString()}`, color: C.goldText },
          { label: 'Cycles Done', value: collections.filter(t => t.status === 'success').length, color: C.ink },
          { label: 'Balance Due', value: upcomingDue > 0 ? `GHS ${upcomingDue.toLocaleString()}` : '—', color: upcomingDue > 0 ? '#C0392B' : C.muted },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: C.white, borderRadius: 10, padding: '12px 10px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: 15, color }}>{value}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Upcoming due banner */}
      {upcomingDue > 0 && (
        <div style={{ margin: '4px 16px 8px', background: '#FFF8E1', border: '1.5px solid #F59E0B', borderRadius: 10, padding: '11px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#856404' }}>⏳ Amount Due</div>
            <div style={{ fontSize: 12, color: '#856404', marginTop: 2 }}>
              Cycle {currentCycle} contribution{outstandingPenalties > 0 ? ` + GHS ${outstandingPenalties} penalty` : ''}
            </div>
          </div>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#856404' }}>GHS {upcomingDue.toLocaleString()}</div>
        </div>
      )}

      {/* Timeline */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', paddingBottom: 80 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 10 }}>Payment Timeline</div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Loading history…</div>
        ) : timeline.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>No history yet.</div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Vertical line */}
            <div style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 2, background: C.border }} />

            {timeline.map(({ cycle, txn, penalty, isCurrent }) => {
              const status = txn ? txn.status === 'success' ? 'paid' : 'failed' : isCurrent ? currentStatus : 'pending';
              const st = STATUS_STYLE[status] || STATUS_STYLE.pending;
              return (
                <div key={cycle} style={{ display: 'flex', gap: 14, marginBottom: 14, position: 'relative' }}>
                  {/* Dot */}
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', background: isCurrent ? C.gold : st.bg,
                    border: `2px solid ${isCurrent ? C.goldText : st.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0, zIndex: 1,
                  }}>
                    {st.icon}
                  </div>

                  {/* Card */}
                  <div style={{
                    flex: 1, background: C.white, borderRadius: 10, padding: '10px 12px',
                    border: `1px solid ${isCurrent ? C.goldText : C.border}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>
                          Cycle {cycle} {isCurrent && <span style={{ color: C.goldText, fontSize: 11 }}>← current</span>}
                        </div>
                        {txn ? (
                          <>
                            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                              {new Date(txn.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            {txn.momo_ref && <div style={{ fontSize: 11, color: C.hint, marginTop: 1 }}>Ref: {txn.momo_ref}</div>}
                          </>
                        ) : (
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                            {isCurrent ? 'Current cycle — payment pending' : 'No transaction recorded'}
                          </div>
                        )}
                        {penalty && (
                          <div style={{ marginTop: 4, fontSize: 11, color: '#C0392B', fontWeight: 600 }}>
                            ⚠️ Penalty: GHS {penalty.penalty_amount} ({penalty.settlement_status})
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: txn?.status === 'success' ? '#16A34A' : C.red }}>
                          {txn ? `GHS ${(txn.amount || 0).toLocaleString()}` : `GHS ${contribution.toLocaleString()}`}
                        </div>
                        <span style={{ background: st.bg, color: st.color, borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 600 }}>
                          {st.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430 }}>
        <NavBar />
      </div>
    </div>
  );
}