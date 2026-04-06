import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import KenteStripe from '../components/qudi/KenteStripe';
import Header from '../components/qudi/Header';
import Avatar from '../components/qudi/Avatar';
import TrustBadge from '../components/qudi/TrustBadge';
import PINConfirm from '../components/qudi/PINConfirm';

const MEMBERS = [
  { id: 'm1', initials: 'AA', full_name: 'Akosua Asante', phone: '+233 244 000 001', trust_score: 92, payment_status: 'paid',    risk: null },
  { id: 'm2', initials: 'KM', full_name: 'Kofi Mensah',   phone: '+233 244 000 002', trust_score: 88, payment_status: 'pending', risk: null },
  { id: 'm3', initials: 'YD', full_name: 'Yaw Darko',     phone: '+233 244 000 003', trust_score: 85, payment_status: 'pending', risk: null },
  { id: 'm4', initials: 'AO', full_name: 'Ama Osei',      phone: '+233 244 000 004', trust_score: 62, payment_status: 'failed',  risk: 'multiCircle' },
  { id: 'm5', initials: 'KB', full_name: 'Kwame Boateng', phone: '+233 244 000 005', trust_score: 45, payment_status: 'pending', risk: 'newMember' },
];

const ST = {
  paid:    { bg: '#D4EDDA', color: '#155724', label: '✓ Paid' },
  pending: { bg: '#FFF8E1', color: '#856404', label: '⏳ Pending' },
  failed:  { bg: '#FCE4E4', color: '#721C24', label: '✗ Failed' },
};

export default function CollectDues() {
  const navigate = useNavigate();
  const [showPIN, setShowPIN] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [results, setResults] = useState({});
  const [liveMode, setLiveMode] = useState(false);

  const pending = MEMBERS.filter(m => m.payment_status !== 'paid');

  const simulateCollections = () => {
    setLiveMode(true);
    setCollecting(true);
    let delay = 0;
    MEMBERS.forEach(m => {
      if (m.payment_status === 'paid') {
        setResults(r => ({ ...r, [m.id]: 'paid' }));
        return;
      }
      delay += 1200;
      setTimeout(() => {
       const outcome = m.payment_status === 'failed' ? 'failed' : 'paid';
       setResults(r => ({ ...r, [m.id]: outcome }));
       // Save to DB
       base44.entities.Transaction.create({
         circle_id: 'c1', member_id: m.id, member_name: m.full_name,
         type: 'collection', amount: 200, status: outcome,
         momo_ref: `QC${Date.now()}`, cycle: 3,
       }).catch(err => console.error('Transaction save failed:', err));
      }, delay);
    });
    setTimeout(() => setCollecting(false), delay + 500);
  };

  if (liveMode) {
    const done = Object.keys(results).length;
    const succeeded = Object.values(results).filter(r => r === 'paid').length;
    return (
      <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <KenteStripe height={4} />
        <Header title="Live collection" subtitle="Kantamanto Traders · Cycle 3" />

        <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
          {/* Live counter */}
          <div style={{
            background: C.ink, borderRadius: 14, padding: '20px', textAlign: 'center', marginBottom: 16,
          }}>
            <div style={{ color: C.gold, fontSize: 48, fontWeight: 800 }}>GHS {succeeded * 200}</div>
            <div style={{ color: C.hintOnDark, fontSize: 14 }}>collected so far</div>
            <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 14 }}>
              <div>
                <div style={{ color: C.cream, fontWeight: 700, fontSize: 20 }}>{succeeded}</div>
                <div style={{ color: C.hintOnDark, fontSize: 12 }}>Paid</div>
              </div>
              <div>
                <div style={{ color: C.red, fontWeight: 700, fontSize: 20 }}>{Object.values(results).filter(r => r === 'failed').length}</div>
                <div style={{ color: C.hintOnDark, fontSize: 12 }}>Failed</div>
              </div>
              <div>
                <div style={{ color: C.gold, fontWeight: 700, fontSize: 20 }}>{MEMBERS.length - done}</div>
                <div style={{ color: C.hintOnDark, fontSize: 12 }}>Waiting</div>
              </div>
            </div>
          </div>

          {/* Member rows */}
          {MEMBERS.map(m => {
            const r = results[m.id];
            const icon = r === 'paid' ? '✓' : r === 'failed' ? '✗' : '···';
            const iconColor = r === 'paid' ? C.green : r === 'failed' ? C.red : C.muted;
            return (
              <div key={m.id} style={{
                background: C.white, borderRadius: 10, padding: '10px 12px',
                marginBottom: 6, border: `0.5px solid ${C.border}`,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <Avatar initials={m.initials} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{m.full_name}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>GHS 200</div>
                </div>
                <span style={{ fontSize: 18, color: iconColor, fontWeight: 700 }}>{icon}</span>
              </div>
            );
          })}

          {!collecting && done === MEMBERS.length && (
            <div style={{ marginTop: 16 }}>
              <div style={{
                background: C.greenBg, border: `1px solid ${C.green}`, borderRadius: 12,
                padding: '14px', textAlign: 'center', marginBottom: 16,
              }}>
                <div style={{ color: C.greenTx, fontWeight: 700, fontSize: 15 }}>Collection complete</div>
                <div style={{ color: C.greenTx, fontSize: 13 }}>GHS {succeeded * 200} collected · {MEMBERS.length - succeeded} failed</div>
              </div>
              <button onClick={() => navigate('/circle-detail')} style={{
                width: '100%', background: C.gold, color: C.ink, border: 'none',
                borderRadius: 12, padding: '16px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              }}>Back to circle</button>
            </div>
          )}
        </div>

        {showPIN && (
          <PINConfirm
            title="Authorise collection"
            amount={`GHS ${pending.length * 200}`}
            recipient={`${pending.length} members`}
            onConfirm={() => { setShowPIN(false); simulateCollections(); }}
            onCancel={() => setShowPIN(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <KenteStripe height={4} />
      <Header title="Collect dues" subtitle="Kantamanto Traders · Cycle 3" />

      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', paddingBottom: 100 }}>
        {/* Summary */}
        <div style={{
          background: C.ink, borderRadius: 12, padding: '16px', marginBottom: 16,
        }}>
          <div style={{ color: C.hintOnDark, fontSize: 12, marginBottom: 6 }}>Collection target</div>
          <div style={{ color: C.gold, fontSize: 28, fontWeight: 800 }}>GHS {MEMBERS.length * 200}</div>
          <div style={{ color: C.hintOnDark, fontSize: 12, marginTop: 4 }}>{pending.length} payment requests to send</div>
        </div>

        {/* Member list */}
        {MEMBERS.map(m => {
          const s = ST[m.payment_status] || ST.pending;
          return (
            <div key={m.id} style={{
              background: C.white, borderRadius: 10, padding: '12px',
              marginBottom: 8, border: `0.5px solid ${m.payment_status === 'failed' ? C.red : C.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: m.risk ? 10 : 0 }}>
                <Avatar initials={m.initials} size={38} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{m.full_name}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{m.phone}</div>
                  <TrustBadge score={m.trust_score} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>GHS 200</div>
                  <span style={{ background: s.bg, color: s.color, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>{s.label}</span>
                </div>
              </div>
              {m.risk && (
                <div style={{
                  background: C.amberBg, border: `1px solid ${C.gold}`, borderRadius: 8,
                  padding: '8px 10px', fontSize: 12, color: C.amberTx, marginTop: 6,
                }}>
                  ⚠ {m.risk === 'multiCircle' ? 'Multi-circle risk — organiser approval required' : 'New member — payout locked for 2 cycles'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430, padding: '16px', background: C.cream,
        borderTop: `1px solid ${C.border}`,
      }}>
        <button onClick={() => setShowPIN(true)} style={{
          width: '100%', background: C.gold, color: C.ink, border: 'none',
          borderRadius: 12, padding: '16px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
        }}>
          Send {pending.length} collection requests — GHS {pending.length * 200}
        </button>
      </div>

      {showPIN && (
        <PINConfirm
          title="Authorise collection"
          amount={`GHS ${pending.length * 200}`}
          recipient={`${pending.length} members`}
          onConfirm={() => { setShowPIN(false); setLiveMode(true); simulateCollections(); }}
          onCancel={() => setShowPIN(false)}
        />
      )}
    </div>
  );
}