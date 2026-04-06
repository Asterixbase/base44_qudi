import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';
import { runReconciliation } from '../lib/reconciliationEngine';

export default function ReconciliationPage() {
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);

  const handleRun = async () => {
    setRunning(true);
    setResults(null);
    const data = await runReconciliation();
    setResults(data);
    setRunning(false);
  };

  const matched   = results?.filter(r => r.status === 'matched')   || [];
  const unmatched = results?.filter(r => r.status === 'unmatched') || [];

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.ink }}>
        <Header dark title="MoMo Reconciliation" subtitle="Auto-match transactions to members" onBack={() => navigate('/dashboard')} />
        <KenteStripe height={3} />

        {/* Summary stats */}
        {results && (
          <div style={{ display: 'flex', padding: '10px 16px 14px' }}>
            {[
              { label: 'Total checked', val: results.length },
              { label: 'Auto-matched',  val: matched.length },
              { label: 'Unmatched',     val: unmatched.length },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, textAlign: 'center',
                borderRight: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none',
              }}>
                <div style={{ color: i === 1 ? C.gold : i === 2 && unmatched.length > 0 ? '#F87171' : C.gold, fontWeight: 800, fontSize: 20 }}>{s.val}</div>
                <div style={{ color: C.hintOnDark, fontSize: 11, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Run button */}
      <div style={{ padding: '14px 16px', background: C.white, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={handleRun} disabled={running} style={{
          width: '100%', background: running ? C.border : C.ink,
          color: running ? C.muted : C.gold,
          border: 'none', borderRadius: 10, padding: '13px',
          fontWeight: 700, fontSize: 15, cursor: running ? 'default' : 'pointer',
        }}>
          {running ? '⏳ Running reconciliation…' : '🔄 Run Auto-Reconciliation'}
        </button>
        <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 8 }}>
          Checks MoMo transaction logs against member list and marks matches as Paid automatically.
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', paddingBottom: 80 }}>
        {results === null && !running && (
          <div style={{ textAlign: 'center', padding: '56px 0' }}>
            <div style={{ fontSize: 48 }}>🔍</div>
            <div style={{ fontWeight: 700, color: C.ink, marginTop: 12, fontSize: 16 }}>Ready to reconcile</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
              Press the button above to scan all active circles for MoMo matches.
            </div>
          </div>
        )}

        {results !== null && (
          <>
            {/* Matched */}
            {matched.length > 0 && (
              <>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 8 }}>✅ Auto-matched ({matched.length})</div>
                {matched.map((r, i) => (
                  <div key={i} style={{
                    background: C.white, borderRadius: 10, padding: '12px 14px', marginBottom: 6,
                    border: '1.5px solid #86EFAC',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{r.member_name}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{r.circle_name}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Ref: {r.momo_ref}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: 16, color: '#16A34A' }}>GHS {(r.amount || 0).toLocaleString()}</div>
                        <span style={{ background: '#DCFCE7', color: '#16A34A', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>PAID ✓</span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Unmatched */}
            {unmatched.length > 0 && (
              <>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.ink, margin: '12px 0 8px' }}>⚠️ Unmatched ({unmatched.length})</div>
                {unmatched.map((r, i) => (
                  <div key={i} style={{
                    background: C.white, borderRadius: 10, padding: '12px 14px', marginBottom: 6,
                    border: `1.5px solid ${C.border}`,
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{r.member_name}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{r.circle_name}</div>
                    <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4, fontWeight: 600 }}>No MoMo transaction found — manual review needed</div>
                  </div>
                ))}
              </>
            )}

            {results.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 36 }}>📭</div>
                <div style={{ fontWeight: 700, color: C.ink, marginTop: 10 }}>No unpaid members found</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>All members in active circles are already marked as paid.</div>
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