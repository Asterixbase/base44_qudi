import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';
import Avatar from '../components/qudi/Avatar';
import {
  calcDaysLate, calcPenaltyAmount, triggerPenalty,
  scanFlaggedMembers,
} from '../lib/penaltyEngine';

const TABS = [
  { id: 'flagged',  label: '🚩 Flagged' },
  { id: 'scanner',  label: '⚙️ Bulk Scan' },
  { id: 'ledger',   label: '📋 Ledger' },
];

export default function AutoPenaltyScanner() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('flagged');

  // shared
  const [cycleStartDate, setCycleStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [ledger, setLedger] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(true);

  // flagged tab
  const [flagged, setFlagged] = useState([]);
  const [loadingFlagged, setLoadingFlagged] = useState(false);
  const [chargingId, setChargingId] = useState(null); // member.id being charged
  const [chargedIds, setChargedIds] = useState(new Set());

  // bulk scanner
  const [circles, setCircles] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);

  useEffect(() => {
    base44.entities.PenaltyLedger.filter({ settlement_status: 'outstanding' }, '-created_date', 50)
      .then(l => { setLedger(l); setLoadingLedger(false); });
    base44.entities.Circle.filter({ status: 'active', penalty_enabled: true }, '-created_date', 30)
      .then(setCircles);
  }, []);

  // Auto-load flagged on first tab view
  useEffect(() => {
    if (tab === 'flagged' && flagged.length === 0 && !loadingFlagged) {
      loadFlagged();
    }
  }, [tab]);

  const loadFlagged = async () => {
    setLoadingFlagged(true);
    const data = await scanFlaggedMembers(cycleStartDate);
    setFlagged(data);
    setLoadingFlagged(false);
  };

  const chargeOne = async (entry) => {
    setChargingId(entry.member.id);
    await triggerPenalty({ circle: entry.circle, member: entry.member, daysLate: entry.daysLate });
    setChargedIds(prev => new Set([...prev, entry.member.id]));
    // Refresh ledger count
    const l = await base44.entities.PenaltyLedger.filter({ settlement_status: 'outstanding' }, '-created_date', 50);
    setLedger(l);
    setChargingId(null);
  };

  const runBulkScan = async () => {
    setScanning(true);
    const applied = [];
    const skipped = [];

    for (const circle of circles) {
      const members = await base44.entities.Member.filter({ circle_id: circle.id });
      const overdue = members.filter(m => m.payment_status === 'overdue' || m.payment_status === 'failed');

      for (const member of overdue) {
        const existing = await base44.entities.PenaltyLedger.filter({
          circle_id: circle.id, member_id: member.id,
          cycle: circle.current_cycle || 1, settlement_status: 'outstanding',
        });
        if (existing.length > 0) {
          skipped.push({ name: member.full_name, circle: circle.name, reason: 'Already penalised' });
          continue;
        }
        const daysLate = calcDaysLate(circle, cycleStartDate);
        if (daysLate <= 0) { skipped.push({ name: member.full_name, circle: circle.name, reason: 'Not yet overdue' }); continue; }
        const amt = calcPenaltyAmount(circle, circle.contribution_amount || 0, daysLate);
        if (amt <= 0) { skipped.push({ name: member.full_name, circle: circle.name, reason: `In grace period` }); continue; }

        const r = await triggerPenalty({ circle, member, daysLate });
        if (r) applied.push({ name: member.full_name, circle: circle.name, daysLate, amount: r.penaltyAmount });
      }
    }

    const freshLedger = await base44.entities.PenaltyLedger.filter({ settlement_status: 'outstanding' }, '-created_date', 50);
    setLedger(freshLedger);
    setScanResults({ applied, skipped });
    setScanning(false);
  };

  const totalOutstanding = ledger.reduce((s, l) => s + (l.penalty_amount || 0), 0);
  const actionable = flagged.filter(f => !f.alreadyPenalised && f.penaltyEnabled && !f.withinGrace && f.daysLate > 0 && !chargedIds.has(f.member.id));
  const already = flagged.filter(f => f.alreadyPenalised || chargedIds.has(f.member.id));

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.ink }}>
        <Header dark title="Penalty Scanner" subtitle="Late payment monitoring & auto-fines" onBack={() => navigate(-1)} />
        <KenteStripe height={3} />

        {/* Stats strip */}
        <div style={{ display: 'flex', padding: '10px 16px', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#F87171', fontWeight: 800, fontSize: 18 }}>{flagged.filter(f => !f.alreadyPenalised && !chargedIds.has(f.member.id)).length}</div>
            <div style={{ color: C.hintOnDark, fontSize: 10 }}>Flagged</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: C.gold, fontWeight: 800, fontSize: 18 }}>{ledger.length}</div>
            <div style={{ color: C.hintOnDark, fontSize: 10 }}>Outstanding</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#86EFAC', fontWeight: 800, fontSize: 18 }}>GHS {totalOutstanding.toLocaleString()}</div>
            <div style={{ color: C.hintOnDark, fontSize: 10 }}>Total Debt</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '10px 4px', background: 'none', border: 'none',
              color: tab === t.id ? C.gold : C.hintOnDark,
              fontWeight: tab === t.id ? 700 : 400, fontSize: 12, cursor: 'pointer',
              borderBottom: tab === t.id ? `2px solid ${C.gold}` : '2px solid transparent',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', paddingBottom: 80 }}>

        {/* ── FLAGGED TAB ── */}
        {tab === 'flagged' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>
                {loadingFlagged ? 'Scanning…' : `${actionable.length} member${actionable.length !== 1 ? 's' : ''} need action`}
              </div>
              <button onClick={loadFlagged} disabled={loadingFlagged} style={{
                background: C.ink, color: C.gold, border: 'none', borderRadius: 8,
                padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>🔄 Refresh</button>
            </div>

            {/* Cycle start date config */}
            <div style={{ background: C.white, borderRadius: 10, padding: '12px', marginBottom: 12, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 6 }}>CYCLE START DATE (for days-late calc)</div>
              <input type="date" value={cycleStartDate}
                onChange={e => { setCycleStartDate(e.target.value); setFlagged([]); }}
                style={{ width: '100%', padding: '8px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.ink, background: C.cream, boxSizing: 'border-box' }} />
            </div>

            {loadingFlagged && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted }}>Scanning active circles…</div>
            )}

            {!loadingFlagged && flagged.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 40 }}>✅</div>
                <div style={{ fontWeight: 700, color: C.ink, marginTop: 12 }}>No overdue members found</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>All members are on time across active circles.</div>
              </div>
            )}

            {/* Actionable — can charge */}
            {actionable.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', marginBottom: 8 }}>NEEDS PENALTY CHARGE ({actionable.length})</div>
                {actionable.map((entry, i) => (
                  <FlaggedCard
                    key={entry.member.id + i}
                    entry={entry}
                    charging={chargingId === entry.member.id}
                    onCharge={() => chargeOne(entry)}
                  />
                ))}
              </>
            )}

            {/* Grace period / no penalty */}
            {flagged.filter(f => (f.withinGrace || !f.penaltyEnabled) && !f.alreadyPenalised && !chargedIds.has(f.member.id)).length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, margin: '12px 0 8px' }}>WITHIN GRACE / NO PENALTY RULE</div>
                {flagged.filter(f => (f.withinGrace || !f.penaltyEnabled) && !f.alreadyPenalised && !chargedIds.has(f.member.id)).map((entry, i) => (
                  <FlaggedCard key={'grace-' + entry.member.id + i} entry={entry} grace />
                ))}
              </>
            )}

            {/* Already penalised */}
            {already.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, margin: '12px 0 8px' }}>ALREADY PENALISED THIS CYCLE ({already.length})</div>
                {already.map((entry, i) => (
                  <FlaggedCard key={'done-' + entry.member.id + i} entry={entry} done />
                ))}
              </>
            )}
          </>
        )}

        {/* ── BULK SCANNER TAB ── */}
        {tab === 'scanner' && (
          <>
            <div style={{ background: C.white, borderRadius: 12, padding: 14, marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>CYCLE START DATE</div>
              <input type="date" value={cycleStartDate} onChange={e => setCycleStartDate(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, color: C.ink, background: C.cream, boxSizing: 'border-box' }} />
              <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>Scans all active circles with penalty rules enabled and charges all eligible overdue members at once.</div>
            </div>

            {circles.length > 0 && (
              <div style={{ background: C.white, borderRadius: 12, padding: 14, marginBottom: 14, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>CIRCLES IN SCOPE ({circles.length})</div>
                {circles.map((c, i) => {
                  const dl = calcDaysLate(c, cycleStartDate);
                  const sample = calcPenaltyAmount(c, c.contribution_amount || 0, dl);
                  return (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < circles.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{c.penalty_type?.replace('_', ' ')} · {dl > 0 ? `${dl} days late` : 'not yet due'}</div>
                      </div>
                      {sample > 0
                        ? <span style={{ background: '#FEE2E2', color: '#DC2626', fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 8px' }}>GHS {sample}</span>
                        : <span style={{ background: '#DCFCE7', color: '#16A34A', fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '3px 8px' }}>In grace</span>
                      }
                    </div>
                  );
                })}
              </div>
            )}

            {circles.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: C.muted, fontSize: 13, background: C.white, borderRadius: 12, marginBottom: 14 }}>
                No active circles with penalty rules. Configure penalty settings first.
              </div>
            )}

            <button onClick={runBulkScan} disabled={scanning || circles.length === 0} style={{
              width: '100%', padding: '14px', fontWeight: 800, fontSize: 15,
              background: scanning || circles.length === 0 ? C.border : C.gold,
              color: C.ink, border: 'none', borderRadius: 12,
              cursor: scanning || circles.length === 0 ? 'default' : 'pointer', marginBottom: 16,
            }}>
              {scanning ? '⚙️ Scanning all circles…' : `⚡ Run Bulk Penalty Scan`}
            </button>

            {scanResults && (
              <div>
                {scanResults.applied.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px', background: '#DCFCE7', borderRadius: 10, color: '#16A34A', fontWeight: 600, marginBottom: 10 }}>
                    ✅ No new penalties — all members within grace or already charged.
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 8 }}>✅ {scanResults.applied.length} Penalt{scanResults.applied.length > 1 ? 'ies' : 'y'} Applied</div>
                    {scanResults.applied.map((r, i) => (
                      <div key={i} style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px', marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>{r.name}</div>
                            <div style={{ fontSize: 11, color: C.muted }}>{r.circle} · {r.daysLate} days late</div>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: '#DC2626' }}>GHS {r.amount}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {scanResults.skipped.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 6 }}>SKIPPED ({scanResults.skipped.length})</div>
                    {scanResults.skipped.map((s, i) => (
                      <div key={i} style={{ fontSize: 12, color: C.muted, padding: '4px 0', borderBottom: `1px solid ${C.border}` }}>
                        {s.name} ({s.circle}) — {s.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── LEDGER TAB ── */}
        {tab === 'ledger' && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 12 }}>
              OUTSTANDING PENALTIES — GHS {totalOutstanding.toLocaleString()} total
            </div>
            {loadingLedger && <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: 20 }}>Loading…</div>}
            {!loadingLedger && ledger.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 40 }}>✅</div>
                <div style={{ fontWeight: 700, color: C.ink, marginTop: 10 }}>No outstanding penalties</div>
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
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#DC2626' }}>GHS {entry.penalty_amount}</div>
                    <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: 9, fontWeight: 700, borderRadius: 4, padding: '2px 6px' }}>OUTSTANDING</span>
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

function FlaggedCard({ entry, onCharge, charging, grace, done }) {
  const { member, circle, daysLate, penaltyAmount } = entry;
  const initials = member.initials || member.full_name?.slice(0, 2).toUpperCase();
  const statusColor = done ? '#16A34A' : grace ? C.muted : '#DC2626';
  const statusBg = done ? '#DCFCE7' : grace ? C.cream : '#FEE2E2';

  return (
    <div style={{ background: C.white, borderRadius: 10, padding: '12px', marginBottom: 8, border: `1px solid ${done ? '#A7F3D0' : grace ? C.border : '#FECACA'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar initials={initials} size={38} bg={statusBg} color={statusColor} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>{member.full_name}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{circle.name} · Cycle {circle.current_cycle || 1}</div>
          <div style={{ fontSize: 11, marginTop: 2, color: daysLate > 0 ? '#DC2626' : C.muted }}>
            {daysLate > 0 ? `${daysLate} days late` : 'Not yet overdue'}
            {member.guarantor_name && <span style={{ color: C.muted }}> · Guarantor: {member.guarantor_name}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {done ? (
            <span style={{ background: '#DCFCE7', color: '#16A34A', fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '4px 8px' }}>✓ Charged</span>
          ) : grace ? (
            <span style={{ background: C.cream, color: C.muted, fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '4px 8px' }}>Grace period</span>
          ) : (
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#DC2626', marginBottom: 4 }}>GHS {penaltyAmount}</div>
              <button onClick={onCharge} disabled={charging} style={{
                background: charging ? C.border : '#DC2626', color: C.white,
                border: 'none', borderRadius: 7, padding: '6px 12px',
                fontSize: 11, fontWeight: 700, cursor: charging ? 'default' : 'pointer',
              }}>
                {charging ? '…' : 'Charge'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}