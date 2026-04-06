import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';
import Avatar from '../components/qudi/Avatar';
import { isPayoutSafe, executeSmartPayout, SAFE_THRESHOLD } from '../lib/smartPayoutEngine';

function thresholdColor(pct) {
  if (pct >= 90) return '#16A34A';
  if (pct >= 80) return '#D97706';
  return '#DC2626';
}

export default function SmartPayoutScheduler() {
  const navigate = useNavigate();
  const [circles, setCircles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(null); // circle.id being executed
  const [results, setResults] = useState({}); // circleId -> result

  useEffect(() => {
    async function load() {
      const activeCircles = await base44.entities.Circle.filter({ status: 'active' }, '-created_date', 30);
      const enriched = await Promise.all(activeCircles.map(async (circle) => {
        const [members, transactions, penalties] = await Promise.all([
          base44.entities.Member.filter({ circle_id: circle.id }, 'payout_position', 50),
          base44.entities.Transaction.filter({ circle_id: circle.id }, '-created_date', 200),
          base44.entities.PenaltyLedger.filter({ circle_id: circle.id, settlement_status: 'outstanding' }),
        ]);
        const analysis = isPayoutSafe(circle, members, transactions);
        const winner = members.filter(m => !m.has_received_payout).sort((a, b) => (a.payout_position || 99) - (b.payout_position || 99))[0];
        const totalPenalties = penalties.reduce((s, p) => s + (p.penalty_amount || 0), 0);
        const netPayout = Math.max(0, analysis.collected - totalPenalties);
        return { circle, members, analysis, winner, totalPenalties, netPayout };
      }));
      setCircles(enriched);
      setLoading(false);
    }
    load();
  }, []);

  const triggerPayout = async (entry) => {
    if (!entry.winner) return;
    setExecuting(entry.circle.id);
    const res = await executeSmartPayout({
      circle: entry.circle,
      winner: entry.winner,
      amount: entry.netPayout,
      note: `Smart payout: ${entry.analysis.collectionPct}% collected. Penalties deducted: GHS ${entry.totalPenalties}.`,
    });
    setResults(r => ({ ...r, [entry.circle.id]: res }));
    // Update local state to reflect payout done
    setCircles(prev => prev.map(e =>
      e.circle.id === entry.circle.id
        ? { ...e, winner: null }
        : e
    ));
    setExecuting(null);
  };

  const safeToPay = circles.filter(e => e.analysis.safe && e.winner && !results[e.circle.id]);
  const waiting   = circles.filter(e => !e.analysis.safe && e.winner && !results[e.circle.id]);
  const done      = circles.filter(e => results[e.circle.id] || !e.winner);

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.ink }}>
        <Header dark title="Smart Payout Scheduler" subtitle={`Threshold: ${Math.round(SAFE_THRESHOLD * 100)}% pot collected`} onBack={() => navigate(-1)} />
        <KenteStripe height={3} />

        {/* Stats */}
        <div style={{ display: 'flex', padding: '12px 16px 16px', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#4ADE80', fontWeight: 800, fontSize: 20 }}>{safeToPay.length}</div>
            <div style={{ color: C.hintOnDark, fontSize: 10 }}>Ready to pay</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#FCD34D', fontWeight: 800, fontSize: 20 }}>{waiting.length}</div>
            <div style={{ color: C.hintOnDark, fontSize: 10 }}>Waiting</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: C.hintOnDark, fontWeight: 800, fontSize: 20 }}>{done.length}</div>
            <div style={{ color: C.hintOnDark, fontSize: 10 }}>Completed</div>
          </div>
        </div>
      </div>

      {/* Threshold explanation */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '10px 16px' }}>
        <div style={{ fontSize: 12, color: C.muted }}>
          Payouts are automatically gated — they only execute when <strong style={{ color: C.ink }}>{Math.round(SAFE_THRESHOLD * 100)}% or more</strong> of the gross pot has been collected for that cycle. This protects the circle from underfunded distributions.
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', paddingBottom: 80 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>Analysing circles…</div>
        ) : circles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>No active circles found.</div>
        ) : (
          <>
            {/* Ready to pay */}
            {safeToPay.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', marginBottom: 8 }}>✅ SAFE TO EXECUTE ({safeToPay.length})</div>
                {safeToPay.map(entry => (
                  <CirclePayoutCard
                    key={entry.circle.id}
                    entry={entry}
                    onTrigger={() => triggerPayout(entry)}
                    isExecuting={executing === entry.circle.id}
                    result={results[entry.circle.id]}
                  />
                ))}
              </>
            )}

            {/* Waiting for threshold */}
            {waiting.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706', margin: '14px 0 8px' }}>⏳ WAITING FOR THRESHOLD ({waiting.length})</div>
                {waiting.map(entry => (
                  <CirclePayoutCard key={entry.circle.id} entry={entry} waiting />
                ))}
              </>
            )}

            {/* Done / no winner */}
            {done.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, margin: '14px 0 8px' }}>COMPLETED / ALL PAID ({done.length})</div>
                {done.map(entry => (
                  <CirclePayoutCard key={entry.circle.id} entry={entry} isDone result={results[entry.circle.id]} />
                ))}
              </>
            )}
          </>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430 }}>
        <NavBar />
      </div>
    </div>
  );
}

function CirclePayoutCard({ entry, onTrigger, isExecuting, waiting, isDone, result }) {
  const { circle, analysis, winner, netPayout, totalPenalties } = entry;
  const tc = thresholdColor(analysis.collectionPct);

  return (
    <div style={{
      background: C.white, borderRadius: 12, padding: '14px', marginBottom: 10,
      border: `1px solid ${analysis.safe && !isDone ? '#86EFAC' : waiting ? '#FCD34D' : C.border}`,
    }}>
      {/* Circle header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{circle.name}</div>
          <div style={{ fontSize: 11, color: C.muted }}>Cycle {circle.current_cycle || 1} · {circle.max_members} members</div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 8px',
          background: analysis.safe ? '#DCFCE7' : '#FEF3C7',
          color: analysis.safe ? '#16A34A' : '#92400E',
        }}>
          {analysis.collectionPct}% collected
        </span>
      </div>

      {/* Collection progress */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginBottom: 4 }}>
          <span>GHS {analysis.collected.toLocaleString()} collected</span>
          <span>Target: GHS {Math.round(analysis.grossPot * SAFE_THRESHOLD).toLocaleString()}</span>
        </div>
        <div style={{ position: 'relative', height: 8, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(100, analysis.collectionPct)}%`, background: tc, borderRadius: 4, transition: 'width 0.4s' }} />
          {/* Threshold marker */}
          <div style={{ position: 'absolute', top: 0, left: `${Math.round(SAFE_THRESHOLD * 100)}%`, width: 2, height: '100%', background: C.ink, opacity: 0.4 }} />
        </div>
        {analysis.shortfall > 0 && (
          <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>⚠ GHS {analysis.shortfall.toLocaleString()} short of safe threshold</div>
        )}
      </div>

      {/* Winner */}
      {winner && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.cream, borderRadius: 8, padding: '10px', marginBottom: 10 }}>
          <Avatar initials={winner.initials || winner.full_name?.slice(0, 2).toUpperCase()} size={34} bg={analysis.safe ? '#DCFCE7' : '#FEF3C7'} color={analysis.safe ? '#16A34A' : '#92400E'} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>{winner.full_name}</div>
            <div style={{ fontSize: 11, color: C.muted }}>Position #{winner.payout_position} · Next recipient</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.ink }}>GHS {netPayout.toLocaleString()}</div>
            {totalPenalties > 0 && <div style={{ fontSize: 10, color: '#DC2626' }}>−GHS {totalPenalties.toLocaleString()} penalties</div>}
          </div>
        </div>
      )}

      {/* Forecast context */}
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
        Forecast reliability: <strong style={{ color: thresholdColor(analysis.forecastPct) }}>{analysis.forecastPct}%</strong> based on member history
      </div>

      {/* Action */}
      {result ? (
        <div style={{ background: '#DCFCE7', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: '#16A34A', fontSize: 13 }}>✅ Payout Sent</div>
          <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>Ref: {result.txRef}</div>
        </div>
      ) : isDone ? (
        <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: '6px' }}>All members have received payouts this cycle.</div>
      ) : waiting ? (
        <div style={{ background: '#FEF3C7', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#92400E', fontWeight: 600 }}>⏳ Waiting for {SAFE_THRESHOLD * 100}% collection threshold</div>
          <div style={{ fontSize: 11, color: '#92400E', marginTop: 2 }}>GHS {analysis.shortfall.toLocaleString()} more needed</div>
        </div>
      ) : (
        <button onClick={onTrigger} disabled={isExecuting} style={{
          width: '100%', padding: '12px', background: isExecuting ? C.border : C.gold,
          color: C.ink, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800,
          cursor: isExecuting ? 'default' : 'pointer',
        }}>
          {isExecuting ? '⏳ Processing…' : `⚡ Execute Payout — GHS ${netPayout.toLocaleString()}`}
        </button>
      )}
    </div>
  );
}