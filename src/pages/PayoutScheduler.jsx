import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';
import Avatar from '../components/qudi/Avatar';
import TrustBadge from '../components/qudi/TrustBadge';
import { buildPayoutSequence, executeNextPayout } from '../lib/payoutScheduler';

const ORDER_LABELS = {
  random:   { icon: '🎲', label: 'Random Draw',    desc: 'Randomised each cycle' },
  fixed:    { icon: '📋', label: 'Fixed Position',  desc: 'Ordered by position' },
  rotation: { icon: '🔄', label: 'Rotation',        desc: 'Sequential rotation' },
  bid:      { icon: '🏷️', label: 'Bidding',         desc: 'Highest bid goes first' },
};

export default function PayoutScheduler() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const circleInit = state?.circle || null;

  const [circles, setCircles]       = useState([]);
  const [circle, setCircle]         = useState(circleInit);
  const [members, setMembers]       = useState([]);
  const [sequence, setSequence]     = useState([]);
  const [bids, setBids]             = useState({});
  const [loading, setLoading]       = useState(false);
  const [executing, setExecuting]   = useState(false);
  const [result, setResult]         = useState(null);

  useEffect(() => {
    base44.entities.Circle.filter({ status: 'active' }).then(setCircles);
  }, []);

  useEffect(() => {
    if (!circle) return;
    setLoading(true);
    base44.entities.Member.filter({ circle_id: circle.id }).then(ms => {
      setMembers(ms);
      setSequence(buildPayoutSequence(circle, ms, []));
      setLoading(false);
    });
  }, [circle?.id]);

  // Recompute sequence when bids change (bid mode)
  useEffect(() => {
    if (!circle || members.length === 0) return;
    const bidArr = Object.entries(bids).map(([member_id, amount]) => ({ member_id, amount }));
    setSequence(buildPayoutSequence(circle, members, bidArr));
  }, [bids]);

  const selectCircle = (id) => {
    const c = circles.find(x => x.id === id);
    setCircle(c || null);
    setResult(null);
    setBids({});
  };

  const triggerPayout = async () => {
    if (!circle || sequence.length === 0) return;
    setExecuting(true);
    const recipient = sequence[0];
    const payoutAmount = (circle.contribution_amount || 0) * members.length;

    // 1. Update DB records via existing lib
    const res = await executeNextPayout({ circle, recipient, allMembers: members });

    // 2. Send real MoMo disbursement
    let momoStatus = 'PENDING';
    try {
      const momoRes = await base44.functions.invoke('sendPayoutMoMo', {
        circleId: circle.id,
        cycleName: `Cycle ${circle.current_cycle || 1}`,
        member: {
          id:            recipient.id,
          full_name:     recipient.full_name,
          phone:         recipient.phone,
          payout_amount: payoutAmount,
        },
      });
      momoStatus = momoRes.data?.status || 'PENDING';
    } catch (e) {
      console.error('MoMo payout error:', e);
      momoStatus = 'ERROR';
    }

    setResult({ recipient, ...res, momoStatus });
    // Refresh members + sequence
    const updated = await base44.entities.Member.filter({ circle_id: circle.id });
    setMembers(updated);
    setSequence(buildPayoutSequence(circle, updated, []));
    setBids({});
    setExecuting(false);
  };

  const paidOut  = members.filter(m => m.has_received_payout);
  const remaining = members.filter(m => !m.has_received_payout);
  const orderMeta = ORDER_LABELS[circle?.payout_order] || ORDER_LABELS.fixed;

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.ink }}>
        <Header dark title="Payout Scheduler" subtitle="Manage cycle payouts & sequences" onBack={() => navigate(-1)} />
        <KenteStripe height={3} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 80 }}>

        {/* Circle selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>SELECT CIRCLE</label>
          <select
            value={circle?.id || ''}
            onChange={e => selectCircle(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, fontSize: 14, color: C.ink }}
          >
            <option value="">— choose an active circle —</option>
            {circles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {circle && !loading && (
          <>
            {/* Circle summary */}
            <div style={{ background: C.ink, borderRadius: 12, padding: '14px 16px', marginBottom: 14, display: 'flex', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.hintOnDark, fontSize: 11 }}>CIRCLE</div>
                <div style={{ color: C.cream, fontWeight: 700, fontSize: 15, marginTop: 2 }}>{circle.name}</div>
                <div style={{ color: C.hintOnDark, fontSize: 12, marginTop: 4 }}>Cycle {circle.current_cycle || 1} · {circle.frequency}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: C.hintOnDark, fontSize: 11 }}>PAYOUT PER CYCLE</div>
                <div style={{ color: C.gold, fontWeight: 800, fontSize: 20, marginTop: 2 }}>
                  GHS {((circle.contribution_amount || 0) * members.length).toLocaleString()}
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
                  background: 'rgba(255,255,255,0.1)', borderRadius: 6, padding: '3px 8px',
                }}>
                  <span style={{ fontSize: 13 }}>{orderMeta.icon}</span>
                  <span style={{ color: C.cream, fontSize: 11, fontWeight: 600 }}>{orderMeta.label}</span>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div style={{ background: C.white, borderRadius: 12, padding: '12px 14px', marginBottom: 12, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>PAYOUT PROGRESS</span>
                <span style={{ fontSize: 12, color: C.ink }}>{paidOut.length} / {members.length} members paid out</span>
              </div>
              <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: C.gold, width: `${members.length ? (paidOut.length / members.length) * 100 : 0}%`, borderRadius: 4 }} />
              </div>
            </div>

            {/* Success result */}
            {result && (
              <div style={{ background: '#D4EDDA', border: '1px solid #28A745', borderRadius: 12, padding: '14px', marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#155724' }}>🎉 Payout Initiated!</div>
                <div style={{ fontSize: 13, color: '#155724', marginTop: 4 }}>
                  <strong>GHS {result.payoutAmount?.toLocaleString()}</strong> sent to <strong>{result.recipient?.full_name}</strong>.
                  {result.momoStatus && (
                    <span style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
                      MoMo: <strong>{result.momoStatus}</strong>
                    </span>
                  )}
                  {result.isComplete && <span style={{ display: 'block', marginTop: 4, fontWeight: 700 }}>✅ All members paid — circle marked as Completed!</span>}
                </div>
              </div>
            )}

            {/* Bid inputs */}
            {circle.payout_order === 'bid' && remaining.length > 0 && (
              <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 14, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 10 }}>ENTER BIDS (GHS)</div>
                {remaining.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Avatar initials={m.initials || m.full_name?.slice(0,2).toUpperCase()} size={30} />
                    <span style={{ flex: 1, fontSize: 13, color: C.ink }}>{m.full_name}</span>
                    <input
                      type="number" placeholder="0"
                      value={bids[m.id] || ''}
                      onChange={e => setBids(b => ({ ...b, [m.id]: parseFloat(e.target.value) || 0 }))}
                      style={{ width: 80, padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, textAlign: 'right' }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Next recipient */}
            {sequence.length > 0 ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8 }}>PAYOUT QUEUE</div>
                {sequence.map((m, i) => (
                  <div key={m.id} style={{
                    background: i === 0 ? '#FFF8E1' : C.white,
                    border: `1px solid ${i === 0 ? C.gold : C.border}`,
                    borderRadius: 10, padding: '10px 12px', marginBottom: 6,
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <div style={{ color: C.muted, fontWeight: 700, fontSize: 12, width: 20, textAlign: 'center' }}>#{i + 1}</div>
                    <Avatar initials={m.initials || m.full_name?.slice(0,2).toUpperCase()} size={34} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>{m.full_name}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                        <TrustBadge score={m.trust_score || 70} />
                      </div>
                    </div>
                    {i === 0 && (
                      <span style={{ background: C.gold, color: C.ink, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700 }}>NEXT</span>
                    )}
                    {circle.payout_order === 'bid' && bids[m.id] > 0 && (
                      <span style={{ fontSize: 11, color: C.muted }}>GHS {bids[m.id]}</span>
                    )}
                  </div>
                ))}

                <button
                  onClick={triggerPayout}
                  disabled={executing}
                  style={{
                    width: '100%', marginTop: 16, padding: '14px', background: executing ? C.muted : C.ink,
                    color: C.cream, border: 'none', borderRadius: 12,
                    fontSize: 15, fontWeight: 700, cursor: executing ? 'default' : 'pointer',
                  }}
                >
                  {executing ? 'Processing…' : `🚀 Initiate Payout to ${sequence[0]?.full_name}`}
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: C.muted }}>
                <div style={{ fontSize: 36 }}>🏆</div>
                <div style={{ fontWeight: 700, color: C.ink, marginTop: 10, fontSize: 15 }}>All members have been paid out!</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>This circle is now complete.</div>
              </div>
            )}

            {/* Already paid out */}
            {paidOut.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8 }}>ALREADY PAID OUT</div>
                {paidOut.map(m => (
                  <div key={m.id} style={{
                    background: '#F0FFF4', border: '1px solid #A3D9B1',
                    borderRadius: 10, padding: '10px 12px', marginBottom: 6,
                    display: 'flex', alignItems: 'center', gap: 10, opacity: 0.8,
                  }}>
                    <Avatar initials={m.initials || m.full_name?.slice(0,2).toUpperCase()} size={34} bg="#A3D9B1" color={C.white} />
                    <span style={{ flex: 1, fontSize: 13, color: C.ink }}>{m.full_name}</span>
                    <span style={{ fontSize: 11, color: '#155724', fontWeight: 700 }}>✓ Paid out</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>Loading members…</div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430 }}>
        <NavBar />
      </div>
    </div>
  );
}