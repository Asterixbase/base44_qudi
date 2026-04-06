import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';
import { runPenaltyScan, settlePenaltyViaDeduction } from '../lib/penaltyEngine';

const SETTLEMENT_STYLE = {
  outstanding:   { bg: '#FFF8E1', color: '#856404', label: 'Outstanding' },
  settled:       { bg: '#D4EDDA', color: '#155724', label: 'Settled'     },
  waived:        { bg: '#E3F2FD', color: '#0D47A1', label: 'Waived'      },
};

const TYPE_LABEL = {
  flat_fee:       'Flat Fee',
  percentage:     'Percentage',
  daily_interest: 'Daily Interest',
};

export default function PenaltyLedgerPage() {
  const navigate = useNavigate();
  const [entries, setEntries]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [scanning, setScanning]   = useState(false);
  const [settling, setSettling]   = useState(null);
  const [filter, setFilter]       = useState('outstanding');
  const [scanResult, setScanResult] = useState(null);

  const load = () =>
    base44.entities.PenaltyLedger.list('-created_date', 100).then(d => {
      setEntries(d);
      setLoading(false);
    });

  useEffect(() => { load(); }, []);

  const runScan = async () => {
    setScanning(true);
    setScanResult(null);
    const results = await runPenaltyScan();
    setScanResult(results.length);
    await load();
    setScanning(false);
  };

  const settle = async (entry) => {
    setSettling(entry.id);
    // Use the contribution amount as the basis for the payout
    await settlePenaltyViaDeduction({
      ledgerEntry: entry,
      payoutAmount: entry.contribution_amount || 0,
    });
    await load();
    setSettling(null);
  };

  const waive = async (entry) => {
    setSettling(entry.id);
    await base44.entities.PenaltyLedger.update(entry.id, { settlement_status: 'waived', settlement_method: 'waived' });
    // Also waive linked Penalty records
    const penalties = await base44.entities.Penalty.filter({
      circle_id: entry.circle_id, member_id: entry.member_id, cycle: entry.cycle, status: 'pending',
    });
    for (const p of penalties) await base44.entities.Penalty.update(p.id, { status: 'waived' });
    await base44.entities.Notification.create({
      circle_id: entry.circle_id, member_id: entry.member_id, member_name: entry.member_name,
      phone: 'N/A',
      message: `✅ Your GHS ${entry.penalty_amount} penalty for Cycle ${entry.cycle} in "${entry.circle_name}" has been waived by the organiser. — Qudi`,
      status: 'sent', channel: 'in-app',
    });
    await load();
    setSettling(null);
  };

  const filtered = filter === 'all' ? entries : entries.filter(e => e.settlement_status === filter);
  const totalOutstanding = entries.filter(e => e.settlement_status === 'outstanding').reduce((s, e) => s + (e.penalty_amount || 0), 0);

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.ink }}>
        <Header dark title="Penalty Ledger" subtitle="Debt tracking & auto-deduction" onBack={() => navigate('/dashboard')} />
        <KenteStripe height={3} />

        {/* Summary */}
        <div style={{ display: 'flex', padding: '10px 16px 14px' }}>
          {[
            { label: 'Total entries',  val: entries.length },
            { label: 'Outstanding',    val: entries.filter(e => e.settlement_status === 'outstanding').length },
            { label: 'Total owed GHS', val: totalOutstanding.toLocaleString() },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, textAlign: 'center',
              borderRight: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none',
            }}>
              <div style={{ color: C.gold, fontWeight: 800, fontSize: 20 }}>{s.val}</div>
              <div style={{ color: C.hintOnDark, fontSize: 11, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scan button */}
      <div style={{ padding: '12px 16px', background: C.white, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={runScan} disabled={scanning} style={{
          width: '100%', background: scanning ? C.border : C.ink, color: scanning ? C.muted : C.gold,
          border: 'none', borderRadius: 10, padding: '11px', fontWeight: 700, fontSize: 14, cursor: scanning ? 'default' : 'pointer',
        }}>
          {scanning ? '⏳ Scanning circles…' : '⚡ Run Auto-Penalty Scan'}
        </button>
        {scanResult !== null && (
          <div style={{ fontSize: 13, color: C.green, textAlign: 'center', marginTop: 8, fontWeight: 600 }}>
            {scanResult === 0 ? '✅ No new penalties triggered' : `⚠️ ${scanResult} new penalty${scanResult !== 1 ? 'ies' : 'y'} triggered`}
          </div>
        )}
        <button onClick={() => navigate('/auto-penalties')} style={{
          width: '100%', marginTop: 8, background: 'none', border: `1px solid ${C.border}`,
          color: C.goldText, borderRadius: 10, padding: '9px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
        }}>⚙️ Advanced Scanner & Date Controls →</button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 16px', background: C.white, borderBottom: `1px solid ${C.border}`, overflowX: 'auto' }}>
        {['all', 'outstanding', 'settled', 'waived'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            flexShrink: 0,
            background: filter === f ? C.ink : C.cream,
            color: filter === f ? C.gold : C.muted,
            border: `1px solid ${filter === f ? C.ink : C.border}`,
            borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            <span style={{ marginLeft: 4, opacity: 0.7 }}>
              ({f === 'all' ? entries.length : entries.filter(e => e.settlement_status === f).length})
            </span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', paddingBottom: 80 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>Loading ledger…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 36 }}>📋</div>
            <div style={{ fontWeight: 700, color: C.ink, marginTop: 10 }}>No entries</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Run a scan to auto-detect overdue members.</div>
          </div>
        ) : (
          filtered.map(entry => {
            const s = SETTLEMENT_STYLE[entry.settlement_status] || SETTLEMENT_STYLE.outstanding;
            const isOutstanding = entry.settlement_status === 'outstanding';
            return (
              <div key={entry.id} style={{
                background: C.white, borderRadius: 12, padding: '12px 14px', marginBottom: 8,
                border: `1.5px solid ${isOutstanding ? '#F59E0B' : C.border}`,
              }}>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{entry.member_name}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                      {entry.circle_name || 'Unknown circle'} · Cycle {entry.cycle}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      {TYPE_LABEL[entry.penalty_type] || '—'} · {entry.days_late || 0} days late
                      {entry.auto_triggered && <span style={{ marginLeft: 6, color: C.tealTx, fontWeight: 600 }}>AUTO</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 18, color: isOutstanding ? C.red : C.green }}>
                      GHS {(entry.penalty_amount || 0).toLocaleString()}
                    </div>
                    <span style={{ background: s.bg, color: s.color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                      {s.label}
                    </span>
                  </div>
                </div>

                {/* Deduction info */}
                {entry.settlement_status === 'settled' && (
                  <div style={{ background: C.greenBg, borderRadius: 8, padding: '7px 10px', marginBottom: 8, fontSize: 12, color: C.green }}>
                    ✅ Deducted from payout · {entry.note}
                  </div>
                )}

                {/* Action buttons */}
                {isOutstanding && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button onClick={() => settle(entry)} disabled={settling === entry.id} style={{
                      flex: 1, background: C.ink, color: C.gold, border: 'none',
                      borderRadius: 8, padding: '9px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>
                      {settling === entry.id ? '…' : '💸 Deduct from Payout'}
                    </button>
                    <button onClick={() => waive(entry)} disabled={settling === entry.id} style={{
                      flex: 1, background: '#E3F2FD', color: '#0D47A1', border: '1px solid #90CAF9',
                      borderRadius: 8, padding: '9px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>
                      🤲 Waive
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430 }}>
        <NavBar />
      </div>
    </div>
  );
}