import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';
import Avatar from '../components/qudi/Avatar';
import { checkAllCircles, getCollectionRate } from '../lib/collectionMonitor';
import { sendUrgencyBlast } from '../lib/urgencyBlastEngine';

const ALERT_THRESHOLD = 0.70;

export default function CollectionMonitor() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blastingId, setBlastingId] = useState(null);
  const [blastResult, setBlastResult] = useState(null);
  const [lastCheck, setLastCheck] = useState(null);

  useEffect(() => {
    checkCircles();
    const interval = setInterval(checkCircles, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const checkCircles = async () => {
    const results = await checkAllCircles();
    setAlerts(results);
    setLastCheck(new Date());
    setLoading(false);
  };

  const triggerBlast = async (circle) => {
    setBlastingId(circle.id);
    setBlastResult(null);
    const user = await base44.auth.me();
    const result = await sendUrgencyBlast({ circle, triggedBy: user?.full_name || 'Admin' });
    setBlastResult(result);
    setBlastingId(null);

    // Refresh alerts
    await checkCircles();
  };

  const safeCircles = alerts.length === 0;

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.ink }}>
        <Header dark title="Collection Monitor" subtitle="Real-time collection rate alerts" onBack={() => navigate('/dashboard')} />
        <KenteStripe height={3} />

        {/* Status banner */}
        <div style={{ padding: '12px 16px' }}>
          {safeCircles ? (
            <div style={{ background: '#DCFCE7', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: '#16A34A', fontSize: 13 }}>✅ All circles above 70% threshold</div>
              <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>No alerts at this time</div>
            </div>
          ) : (
            <div style={{ background: '#FEE2E2', borderRadius: 10, padding: '12px' }}>
              <div style={{ fontWeight: 700, color: '#DC2626', fontSize: 13 }}>🚨 {alerts.length} circle{alerts.length > 1 ? 's' : ''} below threshold</div>
              <div style={{ fontSize: 11, color: '#991B1B', marginTop: 2 }}>Collection rates have dropped below 70%. Consider sending urgency blasts.</div>
            </div>
          )}
        </div>

        {/* Last check */}
        <div style={{ padding: '0 16px 10px', fontSize: 10, color: C.hintOnDark }}>
          Last updated: {lastCheck ? lastCheck.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'checking…'} — Auto-refresh every 30s
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', paddingBottom: 80 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>Monitoring circles…</div>
        ) : safeCircles ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <div style={{ fontWeight: 700, color: C.ink, fontSize: 15 }}>All set!</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>All active circles are maintaining healthy collection rates.</div>
            <button onClick={checkCircles} style={{
              marginTop: 16, background: C.gold, color: C.ink, border: 'none', borderRadius: 10,
              padding: '10px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>🔄 Check Now</button>
          </div>
        ) : (
          alerts.map((alert, i) => (
            <AlertCard key={i} alert={alert} onBlast={() => triggerBlast(alert.circle)} isBlasting={blastingId === alert.circle.id} />
          ))
        )}

        {/* Blast result modal */}
        {blastResult && (
          <div style={{ background: C.white, borderRadius: 12, padding: '16px', marginTop: 14, border: `2px solid ${blastResult.sent > 0 ? '#86EFAC' : '#FCD34D'}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: blastResult.sent > 0 ? '#16A34A' : '#D97706', marginBottom: 10 }}>
              {blastResult.sent > 0 ? '✅ Urgency Blast Sent' : '⚠ Partial Send'}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
              <strong>{blastResult.sent}</strong> alerts sent to unpaid members in <strong>{blastResult.circleName}</strong>
              {blastResult.failed > 0 && <> · <strong>{blastResult.failed}</strong> failed</>}
            </div>
            <div style={{ fontSize: 11, background: C.cream, borderRadius: 8, padding: '8px', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, color: C.muted, marginBottom: 4 }}>Ref: {blastResult.blastRef}</div>
              <div style={{ color: C.muted }}>
                {blastResult.results.slice(0, 3).map((r, i) => (
                  <div key={i}>
                    <strong>{r.member}</strong> {r.status === 'sent' ? '✓' : '✗'}
                  </div>
                ))}
                {blastResult.results.length > 3 && <div>+ {blastResult.results.length - 3} more</div>}
              </div>
            </div>
            <button onClick={() => setBlastResult(null)} style={{
              width: '100%', background: C.ink, color: C.cream, border: 'none', borderRadius: 8,
              padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>Close</button>
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430 }}>
        <NavBar />
      </div>
    </div>
  );
}

function AlertCard({ alert, onBlast, isBlasting }) {
  const { circle, rate, collected, grossPot } = alert;
  const shortfall = Math.ceil(grossPot * 0.70 - collected);

  return (
    <div style={{
      background: C.white, borderRadius: 12, padding: '14px', marginBottom: 10,
      border: '2px solid #FCA5A5', boxShadow: '0 0 12px rgba(220,38,38,0.1)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: '#FEE2E2', color: '#DC2626',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 20,
        }}>!</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{circle.name}</div>
          <div style={{ fontSize: 11, color: C.muted }}>Cycle {circle.current_cycle || 1}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#DC2626' }}>{rate}%</div>
          <div style={{ fontSize: 10, color: '#991B1B', fontWeight: 600 }}>Below threshold</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.muted, marginBottom: 4 }}>
          <span>GHS {collected.toLocaleString()}</span>
          <span>Target: GHS {Math.ceil(grossPot * 0.70).toLocaleString()}</span>
        </div>
        <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${rate}%`, background: '#DC2626', borderRadius: 4 }} />
        </div>
      </div>

      {/* Shortfall */}
      <div style={{ background: '#FCE4E4', borderRadius: 8, padding: '8px', marginBottom: 12, fontSize: 12, color: '#721C24', fontWeight: 600 }}>
        🚨 GHS {shortfall.toLocaleString()} more needed to reach 70% threshold
      </div>

      {/* Action */}
      <button onClick={onBlast} disabled={isBlasting} style={{
        width: '100%', padding: '12px', background: isBlasting ? C.border : '#DC2626',
        color: C.white, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
        cursor: isBlasting ? 'default' : 'pointer',
      }}>
        {isBlasting ? '⏳ Sending Blast…' : '🚨 Send Urgency Blast'}
      </button>
    </div>
  );
}