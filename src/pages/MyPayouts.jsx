import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';
import Avatar from '../components/qudi/Avatar';
import TrustBadge from '../components/qudi/TrustBadge';

// ── helpers ──────────────────────────────────────────────────────────────────

function getPayoutDate(circle, positionInQueue) {
  const freqDays = circle.frequency === 'weekly' ? 7 : 30;
  const base = circle.created_date ? new Date(circle.created_date) : new Date();
  const cycle = (circle.current_cycle || 1) + positionInQueue - 1;
  return new Date(base.getTime() + cycle * freqDays * 86400000);
}

function formatCountdown(targetDate) {
  const diff = targetDate - new Date();
  if (diff <= 0) return { label: 'Your turn now!', urgent: true, days: 0 };
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days === 0) return { label: `${hours}h remaining`, urgent: true, days: 0 };
  if (days === 1) return { label: 'Tomorrow!',          urgent: true, days: 1 };
  return { label: `${days} days away`, urgent: false, days };
}

function formatDate(d) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const TX_STATUS_STYLE = {
  success: { bg: '#D4EDDA', color: '#155724', label: 'Paid out' },
  pending: { bg: '#FFF8E1', color: '#856404', label: 'Pending'  },
  failed:  { bg: '#FCE4E4', color: '#721C24', label: 'Failed'   },
};

// ── DEMO DATA (shown when no live data) ────────────────────────────────────

const DEMO_UPCOMING = [
  {
    circleName: 'Kantamanto Traders', frequency: 'monthly', contribution: 200,
    totalMembers: 10, positionInQueue: 2, trustScore: 88, isNext: false,
    payoutAmount: 2000, paidCount: 3,
  },
  {
    circleName: 'Madina Women Circle', frequency: 'weekly', contribution: 100,
    totalMembers: 5, positionInQueue: 1, trustScore: 92, isNext: true,
    payoutAmount: 500, paidCount: 0,
  },
];

const DEMO_HISTORY = [
  { id: 'h1', circle_name: 'Accra Traders', amount: 1500, status: 'success', cycle: 2, created_date: '2026-02-01' },
  { id: 'h2', circle_name: 'Kantamanto Traders', amount: 2000, status: 'success', cycle: 1, created_date: '2026-01-10' },
];

// ── component ────────────────────────────────────────────────────────────────

export default function MyPayouts() {
  const navigate = useNavigate();
  const [upcoming, setUpcoming]   = useState([]);
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('upcoming');

  useEffect(() => {
    async function load() {
      const user = await base44.auth.me();
      const [circles, allMembers, allTx] = await Promise.all([
        base44.entities.Circle.list('-created_date', 50),
        base44.entities.Member.filter({ user_id: user.id }),
        base44.entities.Transaction.filter({ member_id: user.id }, '-created_date', 50),
      ]);

      // Build upcoming payout cards
      const up = [];
      for (const m of allMembers) {
        const circle = circles.find(c => c.id === m.circle_id);
        if (!circle || circle.status === 'completed') continue;
        if (m.has_received_payout) continue;

        // Compute how many unpaid members are ahead of this one
        const allMs = await base44.entities.Member.filter({ circle_id: circle.id });
        const sortedUnpaid = allMs
          .filter(x => !x.has_received_payout)
          .sort((a, b) => (a.payout_position || 0) - (b.payout_position || 0));
        const posInQueue = sortedUnpaid.findIndex(x => x.id === m.id) + 1;
        const paidCount = allMs.filter(x => x.has_received_payout).length;

        up.push({
          circleName: circle.name, frequency: circle.frequency,
          contribution: circle.contribution_amount,
          totalMembers: allMs.length, positionInQueue: posInQueue,
          trustScore: m.trust_score || 70, isNext: posInQueue === 1,
          payoutAmount: (circle.contribution_amount || 0) * allMs.length,
          paidCount, circleCreatedDate: circle.created_date,
          currentCycle: circle.current_cycle,
        });
      }

      // Payout tx history
      const payouts = allTx.filter(t => t.type === 'payout');

      setUpcoming(up.length ? up : null);
      setHistory(payouts.length ? payouts : null);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, []);

  const upcomingData = upcoming ?? DEMO_UPCOMING;
  const historyData  = history  ?? DEMO_HISTORY;

  const totalEarned = historyData
    .filter(t => t.status === 'success')
    .reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: C.ink }}>
        <Header dark title="My Payouts" subtitle="Your payout schedule & history" onBack={() => navigate('/dashboard')} />
        <KenteStripe height={3} />

        {/* Summary strip */}
        <div style={{ display: 'flex', padding: '12px 16px 16px', gap: 0 }}>
          {[
            { label: 'Circles joined', val: upcomingData.length + historyData.length > 0 ? upcomingData.length : '—' },
            { label: 'Total received', val: totalEarned > 0 ? `GHS ${totalEarned.toLocaleString()}` : 'GHS 0' },
            { label: 'Payouts done',   val: historyData.filter(t => t.status === 'success').length },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, textAlign: 'center',
              borderRight: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none',
            }}>
              <div style={{ color: C.gold, fontWeight: 800, fontSize: 18 }}>{s.val}</div>
              <div style={{ color: C.hintOnDark, fontSize: 11, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: C.white, borderBottom: `1px solid ${C.border}` }}>
        {['upcoming', 'history'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '12px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: tab === t ? 700 : 400, fontSize: 14,
            color: tab === t ? C.goldText : C.muted,
            borderBottom: tab === t ? `2px solid ${C.gold}` : '2px solid transparent',
          }}>
            {t === 'upcoming' ? '⏳ Upcoming' : '✅ History'}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', paddingBottom: 80 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>Loading your payouts…</div>
        ) : tab === 'upcoming' ? (
          upcomingData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: 36 }}>🏆</div>
              <div style={{ fontWeight: 700, color: C.ink, marginTop: 10 }}>All paid out!</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>You have no pending payouts.</div>
            </div>
          ) : (
            upcomingData.map((u, i) => <UpcomingCard key={i} data={u} />)
          )
        ) : (
          historyData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted }}>
              <div style={{ fontSize: 36 }}>📭</div>
              <div style={{ marginTop: 10, fontSize: 13 }}>No payout history yet.</div>
            </div>
          ) : (
            historyData.map((tx, i) => <HistoryCard key={tx.id || i} tx={tx} />)
          )
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430 }}>
        <NavBar />
      </div>
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function UpcomingCard({ data }) {
  const fakeCreated = new Date(Date.now() - 30 * 86400000).toISOString();
  const payoutDate = getPayoutDate(
    { frequency: data.frequency, created_date: data.circleCreatedDate || fakeCreated, current_cycle: data.currentCycle || 1 },
    data.positionInQueue
  );
  const countdown = formatCountdown(payoutDate);
  const progress = Math.round((data.paidCount / data.totalMembers) * 100);

  return (
    <div style={{
      background: C.white, borderRadius: 14, marginBottom: 14,
      border: `1.5px solid ${data.isNext ? C.gold : C.border}`,
      overflow: 'hidden',
    }}>
      {/* Top band */}
      {data.isNext && (
        <div style={{ background: C.gold, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>🔔</span>
          <span style={{ fontWeight: 700, fontSize: 12, color: C.ink }}>YOU'RE NEXT IN LINE</span>
        </div>
      )}

      <div style={{ padding: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>{data.circleName}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              Position #{data.positionInQueue} · {data.totalMembers} members · {data.frequency}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: C.goldText, fontWeight: 800, fontSize: 20 }}>
              GHS {data.payoutAmount.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>your payout</div>
          </div>
        </div>

        {/* Countdown */}
        <div style={{
          background: countdown.urgent ? '#FFF8E1' : C.card,
          borderRadius: 10, padding: '10px 14px', marginBottom: 12,
          border: `1px solid ${countdown.urgent ? C.gold : C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>ESTIMATED PAYOUT DATE</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.ink, marginTop: 2 }}>{formatDate(payoutDate)}</div>
          </div>
          <div style={{
            background: countdown.urgent ? C.gold : C.ink,
            color: countdown.urgent ? C.ink : C.cream,
            borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700,
          }}>
            {countdown.label}
          </div>
        </div>

        {/* Circle progress */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>CIRCLE PROGRESS</span>
            <span style={{ fontSize: 11, color: C.ink }}>{data.paidCount} of {data.totalMembers} paid out</span>
          </div>
          <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: C.gold, width: `${progress}%`, borderRadius: 3 }} />
          </div>
        </div>

        <TrustBadge score={data.trustScore} />
      </div>
    </div>
  );
}

function HistoryCard({ tx }) {
  const s = TX_STATUS_STYLE[tx.status] || TX_STATUS_STYLE.pending;
  const date = tx.created_date ? new Date(tx.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  return (
    <div style={{
      background: C.white, borderRadius: 12, padding: '12px 14px', marginBottom: 8,
      border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: s.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
      }}>
        {tx.status === 'success' ? '🎉' : tx.status === 'pending' ? '⏳' : '❌'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{tx.circle_name || tx.member_name || 'Circle payout'}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Cycle {tx.cycle || '—'} · {date}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: tx.status === 'success' ? C.green : C.muted }}>
          GHS {(tx.amount || 0).toLocaleString()}
        </div>
        <span style={{ background: s.bg, color: s.color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
          {s.label}
        </span>
      </div>
    </div>
  );
}