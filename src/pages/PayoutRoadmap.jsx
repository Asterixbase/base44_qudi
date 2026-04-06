import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';
import Avatar from '../components/qudi/Avatar';

function cycleDeadline(circle, cycle) {
  const freqDays = circle.frequency === 'weekly' ? 7 : 30;
  const base = circle.created_date ? new Date(circle.created_date) : new Date();
  return new Date(base.getTime() + cycle * freqDays * 86400000);
}

function shortDateStr(date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const SLOT_STATE = {
  paid:      { bg: '#DCFCE7', border: '#86EFAC', color: '#16A34A', label: 'PAID',     icon: '✓' },
  next:      { bg: '#FEF3C7', border: C.gold,    color: '#92400E', label: 'NEXT',     icon: '⭐' },
  upcoming:  { bg: C.white,   border: C.border,  color: C.muted,   label: 'UPCOMING', icon: '○' },
  shortfall: { bg: '#FEE2E2', border: '#FECACA', color: '#DC2626', label: 'RISK',     icon: '⚠' },
};

export default function PayoutRoadmap() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [circles, setCircles] = useState([]);
  const [circle, setCircle] = useState(state?.circle || null);
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    base44.entities.Circle.filter({ status: 'active' }, '-created_date', 50).then(setCircles);
  }, []);

  useEffect(() => {
    if (!circle?.id) return;
    setLoading(true);
    Promise.all([
      base44.entities.Member.filter({ circle_id: circle.id }, 'payout_position', 50),
      base44.entities.Transaction.filter({ circle_id: circle.id }, '-created_date', 200),
    ]).then(([m, t]) => {
      setMembers(m);
      setTransactions(t);
      setLoading(false);
    });
  }, [circle?.id]);

  if (!circle) {
    return (
      <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: C.ink }}>
          <Header dark title="Payout Roadmap" subtitle="Select a circle" onBack={() => navigate(-1)} />
          <KenteStripe height={3} />
        </div>
        <div style={{ padding: 16, flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 8 }}>SELECT CIRCLE</label>
          <select
            onChange={e => setCircle(circles.find(c => c.id === e.target.value) || null)}
            style={{ width: '100%', padding: '12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, fontSize: 14, color: C.ink }}
          >
            <option value="">— choose an active circle —</option>
            {circles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430 }}>
          <NavBar />
        </div>
      </div>
    );
  }

  const totalCycles = circle.max_members || members.length || 1;
  const currentCycle = circle.current_cycle || 1;

  // Build per-cycle data
  const cycleData = Array.from({ length: totalCycles }, (_, i) => {
    const cycleNum = i + 1;
    const member = members.find(m => m.payout_position === cycleNum);

    // Payout transaction for this cycle
    const payoutTx = transactions.find(t => t.type === 'payout' && t.cycle === cycleNum && t.status === 'success');
    // Collections for this cycle
    const collTxs = transactions.filter(t => t.type === 'collection' && t.cycle === cycleNum && t.status === 'success');
    const collectedCount = collTxs.length;
    const collectedAmount = collTxs.reduce((s, t) => s + (t.amount || 0), 0);
    const expectedAmount = (circle.contribution_amount || 0) * totalCycles;
    const deadline = cycleDeadline(circle, cycleNum);
    const isPast = cycleNum < currentCycle;
    const isCurrent = cycleNum === currentCycle;
    const isShortfall = isCurrent && collectedCount < totalCycles * 0.6 && !payoutTx;

    let slotState;
    if (payoutTx || (member?.has_received_payout && isPast)) slotState = 'paid';
    else if (isCurrent) slotState = isShortfall ? 'shortfall' : 'next';
    else slotState = 'upcoming';

    return { cycleNum, member, payoutTx, collectedCount, collectedAmount, expectedAmount, deadline, slotState, isCurrent };
  });

  const paidCount = cycleData.filter(c => c.slotState === 'paid').length;
  const shortfallCount = cycleData.filter(c => c.slotState === 'shortfall').length;
  const progressPct = Math.round((paidCount / totalCycles) * 100);

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: C.ink }}>
        <Header dark title="Payout Roadmap" subtitle={`${circle.name} · ${totalCycles} cycles`} onBack={() => navigate(-1)} />
        <KenteStripe height={3} />

        {/* Progress bar */}
        <div style={{ padding: '14px 16px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ color: C.hintOnDark, fontSize: 12 }}>
              Cycle <span style={{ color: C.gold, fontWeight: 800 }}>{currentCycle}</span> of {totalCycles}
            </div>
            <div style={{ color: C.gold, fontWeight: 800, fontSize: 14 }}>{progressPct}% complete</div>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: C.gold, borderRadius: 4, transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <div style={{ fontSize: 11, color: '#86EFAC' }}>✓ {paidCount} paid out</div>
            <div style={{ fontSize: 11, color: '#FCD34D' }}>⭐ {totalCycles - paidCount} remaining</div>
            {shortfallCount > 0 && <div style={{ fontSize: 11, color: '#F87171' }}>⚠ {shortfallCount} at risk</div>}
          </div>
        </div>
      </div>

      {/* Circle selector */}
      <div style={{ padding: '10px 16px', background: C.white, borderBottom: `1px solid ${C.border}` }}>
        <select
          value={circle.id}
          onChange={e => setCircle(circles.find(c => c.id === e.target.value) || null)}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.cream, fontSize: 13, color: C.ink }}
        >
          {circles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 16px', background: C.white, borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
        {Object.entries(SLOT_STATE).map(([k, s]) => (
          <span key={k} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
            {s.icon} {s.label}
          </span>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', paddingBottom: 80 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>Loading roadmap…</div>
        ) : (
          <>
            {/* Timeline */}
            {cycleData.map((cd, i) => {
              const s = SLOT_STATE[cd.slotState];
              const initials = cd.member?.initials || cd.member?.full_name?.slice(0, 2).toUpperCase() || '?';
              const isLast = i === cycleData.length - 1;

              return (
                <div key={cd.cycleNum} style={{ display: 'flex', gap: 12, marginBottom: isLast ? 0 : 0 }}>
                  {/* Timeline spine */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 32 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: s.bg, border: `2px solid ${s.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 13, color: s.color,
                    }}>
                      {s.icon}
                    </div>
                    {!isLast && <div style={{ width: 2, flex: 1, minHeight: 16, background: C.border, margin: '4px 0' }} />}
                  </div>

                  {/* Card */}
                  <div style={{
                    flex: 1, background: cd.isCurrent ? s.bg : C.white,
                    border: `1px solid ${cd.isCurrent ? s.border : C.border}`,
                    borderRadius: 10, padding: '10px 12px',
                    marginBottom: 8,
                    boxShadow: cd.isCurrent ? `0 0 0 2px ${s.border}` : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {cd.member ? (
                        <Avatar
                          initials={initials}
                          size={34}
                          bg={cd.slotState === 'paid' ? '#DCFCE7' : cd.slotState === 'next' ? '#FEF3C7' : cd.slotState === 'shortfall' ? '#FEE2E2' : C.card}
                          color={s.color}
                        />
                      ) : (
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 14 }}>?</div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>
                            {cd.member?.full_name || 'TBD'}
                          </span>
                          {cd.isCurrent && (
                            <span style={{ fontSize: 9, fontWeight: 800, background: s.border, color: s.color, padding: '2px 6px', borderRadius: 4 }}>CYCLE {cd.cycleNum}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                          Payout #{cd.cycleNum} · {shortDateStr(cd.deadline)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: cd.slotState === 'paid' ? '#16A34A' : C.ink }}>
                          GHS {((circle.contribution_amount || 0) * totalCycles).toLocaleString()}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 4, padding: '1px 6px' }}>
                          {s.label}
                        </span>
                      </div>
                    </div>

                    {/* Collection progress for current/past cycles */}
                    {(cd.isCurrent || cd.slotState === 'shortfall') && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginBottom: 4 }}>
                          <span>Collections: {cd.collectedCount}/{totalCycles} members</span>
                          <span>GHS {cd.collectedAmount.toLocaleString()} / {((circle.contribution_amount || 0) * totalCycles).toLocaleString()}</span>
                        </div>
                        <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            background: cd.slotState === 'shortfall' ? '#DC2626' : '#16A34A',
                            width: `${Math.min(100, Math.round((cd.collectedAmount / ((circle.contribution_amount || 1) * totalCycles)) * 100))}%`,
                          }} />
                        </div>
                        {cd.slotState === 'shortfall' && (
                          <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, marginTop: 4 }}>
                            ⚠ Shortfall risk — only {cd.collectedCount} of {totalCycles} have contributed
                          </div>
                        )}
                      </div>
                    )}

                    {/* Payout transaction ref */}
                    {cd.payoutTx && (
                      <div style={{ marginTop: 6, fontSize: 11, color: '#16A34A' }}>
                        Ref: {cd.payoutTx.momo_ref || cd.payoutTx.id?.slice(0, 12)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430 }}>
        <NavBar />
      </div>
    </div>
  );
}