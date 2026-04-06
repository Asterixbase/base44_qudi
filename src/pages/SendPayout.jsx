import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import KenteStripe from '../components/qudi/KenteStripe';
import Header from '../components/qudi/Header';
import TrustBadge from '../components/qudi/TrustBadge';
import PINConfirm from '../components/qudi/PINConfirm';

const RECIPIENT = {
  initials: 'YD', full_name: 'Yaw Darko', phone: '+233 244 000 003',
  momo_name: 'YAW DARKO', trust_score: 85, position: 3, amount: 1960,
};

const SECURITY_CHECKS = [
  { label: 'SIM swap check',          status: 'pass' },
  { label: 'Wallet name match',        status: 'pass' },
  { label: 'Multi-circle risk',        status: 'pass' },
  { label: 'Payout position verified', status: 'pass' },
  { label: 'Minimum cycles completed', status: 'pass' },
];

export default function SendPayout() {
  const navigate = useNavigate();
  const [showPIN, setShowPIN] = useState(false);
  const [state, setState] = useState('review'); // review | sending | success | failed

  const handleConfirm = async () => {
    setState('sending');
    // Simulate MoMo API call
    await new Promise(r => setTimeout(r, 2000));
    try {
      await base44.entities.Transaction.create({
        circle_id: 'c1', member_id: 'm3', member_name: RECIPIENT.full_name,
        type: 'payout', amount: RECIPIENT.amount, status: 'success',
        momo_ref: `QP${Date.now()}`, cycle: 3,
        note: `Cycle 3 payout to position #${RECIPIENT.position}`,
      });
    } catch (_) {}
    setState('success');
  };

  if (state === 'sending') {
    return (
      <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>💸</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: C.ink, marginBottom: 8 }}>Sending via MoMo...</div>
        <div style={{ color: C.muted, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
          Disbursing GHS {RECIPIENT.amount} to {RECIPIENT.full_name}
        </div>
        <div style={{ width: '100%', height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: C.gold, width: '65%', borderRadius: 2 }} />
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div style={{ minHeight: '100dvh', background: C.ink, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <KenteStripe height={5} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', background: '#D4EDDA',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, color: '#1B7A3A', marginBottom: 24,
          }}>✓</div>
          <div style={{ color: C.gold, fontSize: 38, fontWeight: 800, marginBottom: 4 }}>GHS {RECIPIENT.amount}</div>
          <div style={{ color: C.cream, fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Payout sent!</div>
          <div style={{ color: C.hintOnDark, fontSize: 14, textAlign: 'center', marginBottom: 32 }}>
            {RECIPIENT.full_name} will receive the funds via MTN MoMo shortly.
          </div>
          {/* Receipt */}
          <div style={{
            background: 'rgba(255,255,255,0.07)', border: `1px solid rgba(235,160,32,0.3)`,
            borderRadius: 12, padding: '14px 16px', width: '100%', marginBottom: 32,
          }}>
            {[
              ['Recipient', RECIPIENT.full_name],
              ['MoMo number', RECIPIENT.phone],
              ['Circle', 'Kantamanto Traders'],
              ['Cycle', '3 of 10'],
              ['Reference', `QP${Date.now().toString().slice(-8)}`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: C.hintOnDark, fontSize: 13 }}>{k}</span>
                <span style={{ color: C.cream, fontSize: 13, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>

          <button onClick={() => navigate('/circle-detail')} style={{
            width: '100%', background: C.gold, color: C.ink, border: 'none',
            borderRadius: 12, padding: '16px', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 12,
          }}>Back to circle</button>
          <button onClick={() => navigate('/dashboard')} style={{
            width: '100%', background: 'rgba(255,255,255,0.08)', color: C.cream,
            border: `1px solid rgba(255,255,255,0.2)`, borderRadius: 12,
            padding: '14px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}>Go to dashboard</button>
        </div>
        <KenteStripe height={5} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <KenteStripe height={4} />
      <Header title="Send payout" subtitle="Kantamanto Traders · Cycle 3" />

      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', paddingBottom: 100 }}>
        {/* Amount card */}
        <div style={{ background: C.ink, borderRadius: 14, padding: '20px', marginBottom: 16, textAlign: 'center' }}>
          <div style={{ color: C.hintOnDark, fontSize: 13, marginBottom: 6 }}>Payout amount</div>
          <div style={{ color: C.gold, fontSize: 38, fontWeight: 800 }}>GHS {RECIPIENT.amount}</div>
          <div style={{ color: C.hintOnDark, fontSize: 12, marginTop: 4 }}>
            GHS 2,000 collected − GHS 40 platform fee (2%)
          </div>
        </div>

        {/* Recipient */}
        <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 16, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 10 }}>RECIPIENT</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', background: C.goldText,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.white, fontWeight: 700, fontSize: 18,
            }}>{RECIPIENT.initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: C.ink }}>{RECIPIENT.full_name}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{RECIPIENT.phone}</div>
            </div>
            <TrustBadge score={RECIPIENT.trust_score} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, background: C.greenBg, borderRadius: 8, padding: '8px', textAlign: 'center' }}>
              <div style={{ color: C.greenTx, fontSize: 11, fontWeight: 600 }}>WALLET NAME</div>
              <div style={{ color: C.greenTx, fontSize: 13, fontWeight: 700, marginTop: 2 }}>{RECIPIENT.momo_name}</div>
            </div>
            <div style={{ flex: 1, background: C.tealBg, borderRadius: 8, padding: '8px', textAlign: 'center' }}>
              <div style={{ color: C.tealTx, fontSize: 11, fontWeight: 600 }}>POSITION</div>
              <div style={{ color: C.tealTx, fontSize: 13, fontWeight: 700, marginTop: 2 }}>#{RECIPIENT.position} of 10</div>
            </div>
          </div>
        </div>

        {/* Security checks */}
        <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 16, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 10 }}>SECURITY CHECKS</div>
          {SECURITY_CHECKS.map(c => (
            <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: C.ink }}>{c.label}</span>
              <span style={{
                background: C.greenBg, color: C.greenTx,
                borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600,
              }}>✓ Pass</span>
            </div>
          ))}
        </div>

        {/* Escrow note */}
        <div style={{
          background: C.tealBg, border: `1px solid ${C.teal}`, borderRadius: 10,
          padding: '12px', fontSize: 13, color: C.tealTx,
        }}>
          🔒 Funds released directly from Qudi escrow to recipient's MoMo wallet. Organiser cannot redirect or intercept payment.
        </div>
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
          Authorise payout — GHS {RECIPIENT.amount}
        </button>
      </div>

      {showPIN && (
        <PINConfirm
          title="Confirm payout"
          amount={`GHS ${RECIPIENT.amount}`}
          recipient={RECIPIENT.full_name}
          onConfirm={() => { setShowPIN(false); handleConfirm(); }}
          onCancel={() => setShowPIN(false)}
        />
      )}
    </div>
  );
}