import { useState } from 'react';
import { C } from '../../lib/qudiTokens';

export default function PINConfirm({ title, amount, recipient, onConfirm, onCancel }) {
  const [pin, setPin] = useState('');
  const [bioState, setBioState] = useState('idle'); // idle | scanning | success

  const handleDigit = (d) => {
    if (pin.length < 4) {
      const next = pin + d;
      setPin(next);
      if (next.length === 4) setTimeout(() => onConfirm(), 400);
    }
  };

  const handleBio = () => {
    setBioState('scanning');
    setTimeout(() => setBioState('success'), 1500);
    setTimeout(() => onConfirm(), 2000);
  };

  const keys = [1,2,3,4,5,6,7,8,9,'bio',0,'del'];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: C.overlay,
      display: 'flex', alignItems: 'flex-end', zIndex: 100,
    }}>
      <div style={{
        background: C.white, borderRadius: '16px 16px 0 0', padding: '24px 20px 32px',
        width: '100%', maxWidth: 430, margin: '0 auto',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 17, color: C.ink }}>{title || 'Confirm transaction'}</div>
          {amount && <div style={{ fontSize: 26, fontWeight: 700, color: C.goldText, marginTop: 8 }}>{amount}</div>}
          {recipient && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>to {recipient}</div>}
        </div>

        {bioState !== 'idle' ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{bioState === 'success' ? '✓' : '👆'}</div>
            <div style={{ color: C.muted, fontSize: 14 }}>
              {bioState === 'scanning' ? 'Scanning fingerprint...' : 'Identity confirmed'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: i < pin.length ? C.ink : C.border,
                  transition: 'background 0.15s',
                }} />
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
              {keys.map((d, i) => (
                <button key={i} onClick={() => {
                  if (d === 'del') setPin(p => p.slice(0,-1));
                  else if (d === 'bio') handleBio();
                  else handleDigit(String(d));
                }} style={{
                  height: 52, borderRadius: 10, border: `0.5px solid ${C.border}`,
                  background: d === 'bio' ? C.tealBg : C.white,
                  fontSize: d === 'bio' ? 11 : 20, fontWeight: 500,
                  color: d === 'bio' ? C.teal : C.ink, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {d === 'del' ? '←' : d === 'bio' ? 'Fingerprint' : d}
                </button>
              ))}
            </div>
            <div style={{ textAlign: 'center', color: C.muted, fontSize: 12, marginBottom: 16 }}>
              Enter your 4-digit Qudi PIN
            </div>
          </>
        )}

        <button onClick={onCancel} style={{
          width: '100%', background: 'none', border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '12px', color: C.muted, fontSize: 14,
          cursor: 'pointer', fontWeight: 500,
        }}>Cancel</button>
      </div>
    </div>
  );
}