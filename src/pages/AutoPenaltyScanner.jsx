import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';
import { calcDaysLate, triggerPenalty, calcPenaltyAmount } from '../lib/penaltyEngine';

export default function AutoPenaltyScanner() {
  const navigate = useNavigate();
  const [circles, setCircles] = useState([]);
  const [cycleStartDate, setCycleStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null); // null = not run yet
  const [ledger, setLedger] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [tab, setTab] = useState('scanner'); // scanner | ledger

  useEffect(() => {
    base44.entities.PenaltyLedger.filter({ settlement_status: 'outstanding' }, '-created_date', 50)
      .then(l => { setLedger(l); setLoadingLedger(false); });
    base44.entities.Circle.filter({ status: 'active', penalty_enabled: true }, '-created_date', 30)
      .then(setCircles);
  }, []);

  const runScan = async () => {
    setScanning(true);
    const scanResults = [];
    const skipped = [];

    for (const circle of circles) {
      const members = await base44.entities.Member.filter({ circle_id: circle.id });
      const overdue = members.filter(m => m.payment_status === 'overdue' || m.payment_status === 'failed');

      for (const member of overdue) {
        // Check if already penalised this cycle
        const existing = await base44.entities.PenaltyLedger.filter({
          circle_id: circle.id,
          member_id: member.id,
          cycle: circle.current_cycle || 1,
          settlement_status: 'outstanding',
        });
        if (existing.length > 0) {
          skipped.push({ member: member.full_name, circle: circle.name, reason: 'Already penalised this cycle' });
          continue;
        }

        const daysLate = calcDaysLate(circle, cycleStartDate);
        if (daysLate <= 0) {
          skipped.push({ member: member.full_name, circle: circle.name, reason: 'Not yet past deadline' });
          continue;
        }

        const penaltyAmount = calcPenaltyAmount(circle, circle.contribution_amount || 0, daysLate);
        if (penaltyAmount <= 0) {
          skipped.push({ member: member.full_name, circle: circle.name, reason: `Within grace period (${circle.penalty_grace_days || 0} days)` });
          continue;
        }

        const result = await triggerPenalty({ circle, member, daysLate });
        if (result) {
          scanResults.push({ member: member.full_name, circle: circle.name, daysLate, ...result });
        }
      }
    }

    // Refresh ledger
    const freshLedger = await base44.entities.PenaltyLedger.filter({ settlement_status: 'outstanding' }, '-created_date', 50);
    setLedger(freshLedger);
    setResults({ applied: scanResults, skipped });
    setScanning(false);
  };

  const totalOutstanding = ledger.reduce((s, l) => s + (l.penalty_amount || 0), 0);

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.ink }}>
        <Header dark title="Auto Penalty Scanner" subtitle="Deadline monitoring · Auto-fine engine" onBack={() => navigate(-1)} />
        <KenteStripe height={3} />
        <div style={{ display: 'flex' }}>
          {['scanner', 'ledger'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '10px', background: 'none', border: 'none',
              color: tab === t ? C.gold : C.hintOnDark,
              fontWeight: tab === t ? 700 : 400, fontSize: 13, cursor: 'pointer',
              borderBottom: tab === t ? `2px solid ${C.gold}` : '2px solid transparent',
              textTransform: 'capitalize',
            }}>{t === 'scanner' ? '⚙️ Scanner' : '📋 Ledger'}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, paddingBottom: 80 }}>

        {tab === 'scanner' && (
          <>
            {/* Summary boxes */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <div style={{ flex: 1, background: C.amberBg, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.amberTx }}>{ledger.length}</div>
                <div style={{ fontSize: 11, color: C.amberTx, fontWeight: 600 }}>Outstanding</div>
              </div>
              <div style={{ flex: 1, background: C.redBg, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.redTx }}>GHS {totalOutstanding.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: C.redTx, fontWeight: 600 }}>Total Debt</div>
              </div>
              <div style={{ flex: 1, background: C.tealBg, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.tealTx }}>{circles.length}</div>
                <div style={{ fontSize: 11, color: C.tealTx, fontWeight: 600 }}>Circles w/ Penalties</div>
              </div>
            </div>

            {/* Configuration */}
            <div style={{ background: C.white, borderRadius: 12, padding: 14, marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>CYCLE START DATE</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
                Days late = today minus the cycle's due date (based on start date + frequency). 
                Grace period per circle is respected automatically.
              </div>
              <input type="date" value={cycleStartDate} onChange={e => setCycleStartDate(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, color: C.ink, background: C.cream, boxSizing: 'border-box' }} />
            </div>

            {/* Eligible circles preview */}
            {circles.length > 0 && (
              <div style={{ background: C.white, borderRadius: 12, padding: 14, marginBottom: 14, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>CIRCLES IN SCOPE</div>
                {circles.map(c => {
                  const daysLate = calcDaysLate(c, cycleStartDate);
                  const samplePenalty = calcPenaltyAmount(c, c.contribution_amount || 0, daysLate);
                  return (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{c.penalty_type?.replace('_', ' ')} · {daysLate > 0 ? `${daysLate} days late` : 'not yet due'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {samplePenalty > 0
                          ? <span style={{ background: C.redBg, color: C.redTx, fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 8px' }}>GHS {samplePenalty}</span>
                          : <span style={{ background: C.greenBg, color: C.greenTx, fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '3px 8px' }}>In grace</span>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {circles.length === 0 && !scanning && (
              <div style={{ textAlign: 'center', padding: '24px', color: C.muted, fontSize: 13, background: C.white, borderRadius: 12, marginBottom: 14 }}>
                No active circles with penalties enabled. Configure penalty settings first.
              </div>
            )}

            {/* Run button */}
            <button onClick={runScan} disabled={scanning || circles.length === 0}
              style={{
                width: '100%', padding: '14px', fontWeight: 800, fontSize: 15,
                background: scanning || circles.length === 0 ? C.border : C.gold,
                color: C.ink, border: 'none', borderRadius: 12,
                cursor: scanning || circles.length === 0 ? 'default' : 'pointer', marginBottom: 16,
              }}>
              {scanning ? '⚙️ Scanning all circles…' : '⚡ Run Penalty Scan Now'}
            </button>

            {/* Results */}
            {results && (
              <div>
                {results.applied.length > 0 && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
                      ✅ {results.applied.length} Penalt{results.applied.length > 1 ? 'ies' : 'y'} Applied
                    </div>
                    {results.applied.map((r, i) => (
                      <div key={i} style={{ background: C.redBg, border: `1px solid #F5C6CB`, borderRadius: 10, padding: '12px', marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>{r.member}</div>
                            <div style={{ fontSize: 11, color: C.muted }}>{r.circle} · {r.daysLate} days late</div>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: C.redTx }}>GHS {r.penaltyAmount}</div>
                        </div>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>Member + guarantor notified · Logged to ledger</div>
                      </div>
                    ))}
                  </>
                )}
                {results.applied.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '16px', background: C.greenBg, borderRadius: 10, color: C.greenTx, fontWeight: 600 }}>
                    ✅ No new penalties to apply — all members are within grace or already penalised.
                  </div>
                )}
                {results.skipped.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>SKIPPED ({results.skipped.length})</div>
                    {results.skipped.map((s, i) => (
                      <div key={i} style={{ fontSize: 12, color: C.muted, padding: '4px 0', borderBottom: `1px solid ${C.border}` }}>
                        {s.member} ({s.circle}) — {s.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'ledger' && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 10 }}>
              OUTSTANDING PENALTIES · GHS {totalOutstanding.toLocaleString()} total
            </div>
            {loadingLedger && <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: 20 }}>Loading…</div>}
            {!loadingLedger && ledger.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: C.muted }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 600, color: C.ink }}>No outstanding penalties</div>
              </div>
            )}
            {ledger.map(entry => (
              <div key={entry.id} style={{ background: C.white, borderRadius: 10, padding: '12px', marginBottom: 8, border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>{entry.member_name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{entry.circle_name} · Cycle {entry.cycle}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{entry.days_late} days late · {entry.penalty_type?.replace('_', ' ')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: C.redTx }}>GHS {entry.penalty_amount}</div>
                    <span style={{ background: C.amberBg, color: C.amberTx, fontSize: 9, fontWeight: 700, borderRadius: 4, padding: '2px 6px' }}>OUTSTANDING</span>
                  </div>
                </div>
                {entry.note && <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontStyle: 'italic' }}>{entry.note}</div>}
              </div>
            ))}
          </>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430 }}>
        <NavBar />
      </div>
    </div>
  );
}