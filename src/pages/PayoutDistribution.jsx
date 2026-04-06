import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';
import Avatar from '../components/qudi/Avatar';
import {
  calculateCyclePayout,
  executePayout,
  generatePayoutStatement,
} from '../lib/payoutDistributionEngine';

export default function PayoutDistribution() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [circles, setCircles] = useState([]);
  const [circle, setCircle] = useState(state?.circle || null);
  const [members, setMembers] = useState([]);
  const [penalties, setPenalties] = useState([]);
  const [breakdown, setBreakdown] = useState(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [step, setStep] = useState('setup'); // setup | preview | executing | done
  const [result, setResult] = useState(null);
  const [deductPenalties, setDeductPenalties] = useState(true);

  useEffect(() => {
    base44.entities.Circle.filter({ status: 'active' }, '-created_date', 30).then(setCircles);
  }, []);

  useEffect(() => {
    if (!circle?.id) return;
    setBreakdown(null);
    setStep('setup');
    setResult(null);
    Promise.all([
      base44.entities.Member.filter({ circle_id: circle.id }, 'payout_position', 50),
      base44.entities.PenaltyLedger.filter({ circle_id: circle.id, settlement_status: 'outstanding' }),
    ]).then(([m, p]) => { setMembers(m); setPenalties(p); });
  }, [circle?.id]);

  const loadBreakdown = async () => {
    setLoadingBreakdown(true);
    const bd = await calculateCyclePayout({ circle, members, penaltyLedger: penalties });
    setBreakdown(bd);
    setStep('preview');
    setLoadingBreakdown(false);
  };

  const executePayoutFlow = async () => {
    if (!breakdown?.winner) return;
    setStep('executing');
    const finalAmount = deductPenalties ? breakdown.netPayout : breakdown.totalCollected;
    const res = await executePayout({
      circle,
      member: breakdown.winner,
      amount: finalAmount,
      note: breakdown.penaltyDeduction > 0 && deductPenalties
        ? `Payout less GHS ${breakdown.penaltyDeduction} penalty deduction`
        : `Cycle ${circle.current_cycle || 1} payout`,
    });
    setResult({ ...res, amount: finalAmount, deduction: deductPenalties ? breakdown.penaltyDeduction : 0 });
    setStep('done');
  };

  const downloadPDF = () => {
    if (!result) return;
    const url = generatePayoutStatement({ circle, member: breakdown.winner, transaction: result.transaction, deduction: result.deduction });
    const a = document.createElement('a');
    a.href = url;
    a.download = `Qudi_Payout_${breakdown.winner.full_name?.replace(/\s/g, '_')}_Cycle${circle.current_cycle || 1}.pdf`;
    a.click();
  };

  // Contribution list enriched with member name
  const enrichedContributions = breakdown?.contributions?.map(t => {
    const m = members.find(mem => mem.id === t.member_id || mem.full_name?.toLowerCase() === t.member_name?.toLowerCase());
    return { ...t, resolved_name: m?.full_name || t.member_name || 'Unknown' };
  }) || [];

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.ink }}>
        <Header dark title="Payout Distribution" subtitle={circle ? `Cycle ${circle.current_cycle || 1} · ${circle.name}` : 'Select a circle'} onBack={() => navigate(-1)} />
        <KenteStripe height={3} />

        {/* Pot banner */}
        {circle && (
          <div style={{ padding: '12px 16px 16px', display: 'flex', gap: 20 }}>
            <div>
              <div style={{ color: C.hintOnDark, fontSize: 11 }}>Gross Pot</div>
              <div style={{ color: C.gold, fontWeight: 800, fontSize: 22 }}>
                GHS {((circle.contribution_amount || 0) * (circle.max_members || 1)).toLocaleString()}
              </div>
            </div>
            {breakdown && (
              <div>
                <div style={{ color: C.hintOnDark, fontSize: 11 }}>Collected ({breakdown.collectionRate}%)</div>
                <div style={{ color: '#86EFAC', fontWeight: 800, fontSize: 22 }}>
                  GHS {breakdown.totalCollected.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', paddingBottom: 80 }}>

        {/* Circle selector */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>SELECT CIRCLE</label>
          <select
            value={circle?.id || ''}
            onChange={e => setCircle(circles.find(c => c.id === e.target.value) || null)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, fontSize: 14, color: C.ink }}
          >
            <option value="">— select active circle —</option>
            {circles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {circle && step === 'setup' && (
          <>
            {/* Penalty deduction toggle */}
            <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 14, border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>Auto-deduct Penalties</div>
                <div style={{ fontSize: 12, color: C.muted }}>Subtract outstanding fines from payout</div>
              </div>
              <div onClick={() => setDeductPenalties(v => !v)} style={{
                width: 48, height: 26, borderRadius: 13, cursor: 'pointer',
                background: deductPenalties ? C.gold : C.border, position: 'relative', flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute', top: 3, left: deductPenalties ? 25 : 3,
                  width: 20, height: 20, borderRadius: '50%', background: C.white,
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </div>
            </div>

            {/* Members overview */}
            <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 10 }}>PAYOUT QUEUE · {members.length} MEMBERS</div>
              {members.slice(0, 6).map((m, i) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: i < members.slice(0,6).length - 1 ? 10 : 0, marginBottom: i < members.slice(0,6).length - 1 ? 10 : 0, borderBottom: i < members.slice(0,6).length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <Avatar initials={m.initials || m.full_name?.slice(0,2)} size={32} bg={m.has_received_payout ? '#D4EDDA' : C.gold} color={m.has_received_payout ? '#155724' : C.ink} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{m.full_name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>Position #{m.payout_position || '?'}</div>
                  </div>
                  {m.has_received_payout
                    ? <span style={{ fontSize: 10, fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '2px 8px', borderRadius: 6 }}>DONE</span>
                    : i === 0 ? <span style={{ fontSize: 10, fontWeight: 700, color: '#856404', background: '#FEF3C7', padding: '2px 8px', borderRadius: 6 }}>NEXT</span>
                    : <span style={{ fontSize: 10, color: C.muted, background: C.cream, padding: '2px 8px', borderRadius: 6 }}>WAITING</span>
                  }
                </div>
              ))}
              {members.length > 6 && <div style={{ fontSize: 11, color: C.muted, marginTop: 8, textAlign: 'center' }}>+{members.length - 6} more members</div>}
            </div>

            <button onClick={loadBreakdown} disabled={loadingBreakdown || members.length === 0} style={{
              width: '100%', padding: '14px', background: loadingBreakdown ? C.border : C.ink,
              color: loadingBreakdown ? C.muted : C.gold, border: 'none', borderRadius: 12,
              fontSize: 15, fontWeight: 800, cursor: loadingBreakdown || members.length === 0 ? 'default' : 'pointer',
            }}>
              {loadingBreakdown ? '⏳ Calculating…' : '🔍 Calculate Payout Breakdown'}
            </button>
          </>
        )}

        {/* Preview / breakdown */}
        {circle && step === 'preview' && breakdown && (
          <>
            {/* Winner card */}
            {breakdown.winner ? (
              <div style={{ background: C.ink, borderRadius: 12, padding: '16px', marginBottom: 14, border: `2px solid ${C.goldText}` }}>
                <div style={{ fontSize: 11, color: C.hintOnDark, fontWeight: 600, marginBottom: 8 }}>CYCLE {circle.current_cycle || 1} WINNER</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar initials={breakdown.winner.initials || breakdown.winner.full_name?.slice(0,2)} size={48} bg={C.goldText} color={C.white} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: C.cream }}>{breakdown.winner.full_name}</div>
                    <div style={{ fontSize: 12, color: C.hintOnDark, marginTop: 2 }}>Position #{breakdown.winner.payout_position || '?'}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: C.white, borderRadius: 12, padding: '16px', marginBottom: 14, border: `1px solid ${C.border}`, textAlign: 'center', color: C.muted, fontSize: 13 }}>
                ✅ All members have already received their payouts this cycle.
              </div>
            )}

            {/* Breakdown table */}
            <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 12 }}>PAYOUT CALCULATION</div>
              {[
                { label: 'Gross Pot (target)', value: `GHS ${breakdown.grossPot.toLocaleString()}`, color: C.ink },
                { label: `Total Collected (${breakdown.collectionRate}%)`, value: `GHS ${breakdown.totalCollected.toLocaleString()}`, color: '#16A34A' },
                { label: 'Penalty Deduction', value: breakdown.penaltyDeduction > 0 ? `− GHS ${breakdown.penaltyDeduction.toLocaleString()}` : 'None', color: breakdown.penaltyDeduction > 0 ? '#DC2626' : C.muted },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#FEF3C7', borderRadius: 8, padding: '12px 10px', marginTop: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>Net Payout</span>
                <span style={{ fontWeight: 900, fontSize: 18, color: '#92400E' }}>
                  GHS {(deductPenalties ? breakdown.netPayout : breakdown.totalCollected).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Contributions received this cycle */}
            <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 10 }}>
                CONTRIBUTIONS RECEIVED ({enrichedContributions.length}/{circle.max_members || '?'})
              </div>
              {enrichedContributions.length === 0 ? (
                <div style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: '12px 0' }}>No transactions recorded for cycle {circle.current_cycle || 1} yet.</div>
              ) : enrichedContributions.map((t, i) => (
                <div key={t.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, marginBottom: 8, borderBottom: i < enrichedContributions.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{t.resolved_name}</div>
                    {t.momo_ref && <div style={{ fontSize: 10, color: C.muted }}>Ref: {t.momo_ref}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#16A34A' }}>GHS {(t.amount || 0).toLocaleString()}</span>
                    <span style={{ fontSize: 10, background: '#DCFCE7', color: '#16A34A', borderRadius: 4, padding: '1px 6px' }}>✓</span>
                  </div>
                </div>
              ))}
            </div>

            {breakdown.winner && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep('setup')} style={{
                  flex: 1, padding: '13px', background: C.white, color: C.ink,
                  border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>← Back</button>
                <button onClick={executePayoutFlow} style={{
                  flex: 2, padding: '13px', background: C.gold, color: C.ink,
                  border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: 'pointer',
                }}>
                  ⚡ Execute Payout
                </button>
              </div>
            )}
          </>
        )}

        {/* Executing */}
        {step === 'executing' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 40 }}>⚙️</div>
            <div style={{ fontWeight: 700, color: C.ink, fontSize: 16, marginTop: 12 }}>Processing payout…</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Sending via MoMo and recording transaction</div>
          </div>
        )}

        {/* Done */}
        {step === 'done' && result && breakdown?.winner && (
          <div>
            <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
              <div style={{ fontSize: 48 }}>🎉</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: C.ink, marginTop: 10 }}>Payout Sent!</div>
            </div>
            <div style={{ background: '#D4EDDA', borderRadius: 12, padding: '16px', border: '1.5px solid #86EFAC', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#155724' }}>{breakdown.winner.full_name}</div>
                <div style={{ fontWeight: 900, fontSize: 18, color: '#16A34A' }}>GHS {result.amount.toLocaleString()}</div>
              </div>
              {result.deduction > 0 && <div style={{ fontSize: 11, color: '#C0392B', marginBottom: 4 }}>Penalty deducted: GHS {result.deduction}</div>}
              <div style={{ fontSize: 11, color: '#1B5E20' }}>Ref: {result.txRef}</div>
              <div style={{ fontSize: 11, color: '#1B5E20', marginTop: 2 }}>Cycle {circle.current_cycle || 1} · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            </div>
            <button onClick={downloadPDF} style={{
              width: '100%', padding: '13px', background: C.ink, color: C.cream,
              border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 10,
            }}>
              📄 Download PDF Statement
            </button>
            <button onClick={() => { setStep('setup'); setBreakdown(null); setResult(null); }} style={{
              width: '100%', padding: '12px', background: C.white, color: C.ink,
              border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              Run Another Cycle
            </button>
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430 }}>
        <NavBar />
      </div>
    </div>
  );
}