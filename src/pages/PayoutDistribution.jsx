import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';
import Avatar from '../components/qudi/Avatar';
import {
  calcMaturityDate,
  isPayoutDue,
  runDistribution,
  generatePayoutStatement,
} from '../lib/payoutDistributionEngine';

const FREQ_LABEL = { weekly: 'Weekly', monthly: 'Monthly' };

export default function PayoutDistribution() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [circles, setCircles] = useState([]);
  const [circle, setCircle] = useState(state?.circle || null);
  const [members, setMembers] = useState([]);
  const [penalties, setPenalties] = useState([]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [deductPenalties, setDeductPenalties] = useState(true);
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState('setup'); // setup | running | done

  useEffect(() => {
    base44.entities.Circle.filter({ status: 'active' }, '-created_date', 30).then(setCircles);
  }, []);

  useEffect(() => {
    if (!circle?.id) return;
    Promise.all([
      base44.entities.Member.filter({ circle_id: circle.id }, 'payout_position', 50),
      base44.entities.PenaltyLedger.filter({ circle_id: circle.id, settlement_status: 'outstanding' }, '-created_date', 100),
    ]).then(([m, p]) => { setMembers(m); setPenalties(p); });
  }, [circle?.id]);

  const dueMembers = members.filter(m => !m.has_received_payout && isPayoutDue(circle, m, startDate));
  const pendingMembers = members.filter(m => !m.has_received_payout && !isPayoutDue(circle, m, startDate));
  const doneMembers = members.filter(m => m.has_received_payout);

  const run = async () => {
    setRunning(true);
    setStep('running');
    const res = await runDistribution({ circle, members: dueMembers, startDate, deductPenalties, penaltyLedger: penalties });
    setResults(res);
    setStep('done');
    setRunning(false);
  };

  const downloadStatement = ({ member, transaction, deduction }) => {
    const url = generatePayoutStatement({ circle, member, transaction, deduction });
    const a = document.createElement('a');
    a.href = url;
    a.download = `Qudi_Statement_${member.full_name?.replace(/\s/g, '_')}_Cycle${circle.current_cycle || 1}.pdf`;
    a.click();
  };

  const grossPot = (circle?.contribution_amount || 0) * (circle?.max_members || 1);

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.ink }}>
        <Header dark title="Payout Distribution" subtitle="Automated payout engine · PDF statements" onBack={() => navigate(-1)} />
        <KenteStripe height={3} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 80 }}>

        {/* Circle selector */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>CIRCLE</label>
          <select
            value={circle?.id || ''}
            onChange={e => { setCircle(circles.find(c => c.id === e.target.value) || null); setStep('setup'); setResults([]); }}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, fontSize: 14, color: C.ink }}
          >
            <option value="">— select active circle —</option>
            {circles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {circle && (
          <>
            {/* Circle summary */}
            <div style={{ background: C.ink, borderRadius: 12, padding: '14px', marginBottom: 14, color: C.cream }}>
              <div style={{ fontSize: 11, color: C.hintOnDark, marginBottom: 4 }}>POT SIZE · {FREQ_LABEL[circle.frequency] || 'Monthly'}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.gold }}>GHS {grossPot.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: C.hintOnDark, marginTop: 4 }}>
                {circle.max_members} members · Cycle {circle.current_cycle || 1} · {members.length} loaded
              </div>
            </div>

            {/* Start date */}
            <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 12, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8 }}>CIRCLE START DATE (for schedule)</div>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, color: C.ink, background: C.cream, boxSizing: 'border-box' }}
              />
            </div>

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

            {/* Member schedule */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 10 }}>PAYOUT SCHEDULE</div>
              {members.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>No members found for this circle.</div>}
              {members.map(m => {
                const maturity = calcMaturityDate(circle, m.payout_position || 1, startDate);
                const due = isPayoutDue(circle, m, startDate);
                const done = m.has_received_payout;
                const outstanding = penalties.filter(p => p.member_id === (m.id || m.user_id)).reduce((s, p) => s + (p.penalty_amount || 0), 0);
                return (
                  <div key={m.id} style={{
                    background: C.white, borderRadius: 10, padding: '12px', marginBottom: 8,
                    border: `1px solid ${done ? '#A8D5B5' : due ? C.gold : C.border}`,
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <Avatar initials={m.initials || m.full_name?.slice(0, 2)} size={38} bg={done ? '#D4EDDA' : due ? C.gold : C.card} color={done ? '#155724' : C.ink} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>{m.full_name}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>
                        Position #{m.payout_position || '?'} · {maturity.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      {outstanding > 0 && <div style={{ fontSize: 10, color: C.red, fontWeight: 600 }}>⚠ GHS {outstanding} penalty outstanding</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {done && <span style={{ background: '#D4EDDA', color: '#155724', fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '3px 8px' }}>PAID OUT</span>}
                      {!done && due && <span style={{ background: C.amberBg, color: C.amberTx, fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '3px 8px' }}>DUE</span>}
                      {!done && !due && <span style={{ background: C.cream, color: C.muted, fontSize: 10, fontWeight: 600, borderRadius: 6, padding: '3px 8px' }}>UPCOMING</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Run button */}
            {step !== 'done' && (
              <div style={{ marginBottom: 16 }}>
                {dueMembers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px', background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, color: C.muted, fontSize: 13 }}>
                    No payouts due based on the selected start date.
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 12, color: C.amberTx, fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>
                      {dueMembers.length} payout{dueMembers.length > 1 ? 's' : ''} ready to execute
                    </div>
                    <button
                      onClick={run}
                      disabled={running}
                      style={{
                        width: '100%', padding: '14px', background: running ? C.border : C.gold,
                        color: C.ink, border: 'none', borderRadius: 12,
                        fontSize: 15, fontWeight: 800, cursor: running ? 'default' : 'pointer',
                      }}
                    >
                      {running ? '⚙️ Processing payouts…' : `⚡ Execute ${dueMembers.length} Payout${dueMembers.length > 1 ? 's' : ''}`}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Results */}
            {step === 'done' && results.length > 0 && (
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 10 }}>
                  ✅ {results.length} Payout{results.length > 1 ? 's' : ''} Executed
                </div>
                {results.map((r, i) => (
                  <div key={i} style={{ background: '#D4EDDA', borderRadius: 12, padding: '14px', marginBottom: 10, border: '1px solid #A8D5B5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#155724' }}>{r.member.full_name}</div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: '#155724' }}>GHS {r.amount.toLocaleString()}</div>
                    </div>
                    {r.deduction > 0 && (
                      <div style={{ fontSize: 11, color: C.red, marginBottom: 4 }}>Penalty deducted: GHS {r.deduction}</div>
                    )}
                    <div style={{ fontSize: 11, color: '#1B5E20', marginBottom: 10 }}>Ref: {r.txRef}</div>
                    <button
                      onClick={() => downloadStatement(r)}
                      style={{
                        width: '100%', padding: '10px', background: C.ink, color: C.cream,
                        border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      📄 Download PDF Statement
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => { setStep('setup'); setResults([]); }}
                  style={{ width: '100%', padding: '12px', background: C.white, color: C.ink, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}
                >
                  Run Another Cycle
                </button>
              </div>
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