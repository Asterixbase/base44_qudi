import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { C } from '../../lib/qudiTokens';
import Avatar from './Avatar';

export default function MarkPaidModal({ member, circle, onClose, onSuccess }) {
  const [momoRef, setMomoRef] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!momoRef.trim()) { setError('Please enter the MoMo reference'); return; }
    setSaving(true);
    await base44.entities.Transaction.create({
      circle_id: circle.id || 'demo',
      member_id: member.id,
      member_name: member.full_name,
      type: 'collection',
      amount: circle.contribution_amount || 200,
      status: 'success',
      momo_ref: momoRef.trim(),
      cycle: circle.current_cycle || 1,
      note: `Manually confirmed by organiser`,
    });
    setSaving(false);
    onSuccess(member.id);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: C.cream, borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 430,
        padding: '24px 20px 36px',
      }} onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div style={{ width: 36, height: 4, background: C.border, borderRadius: 2, margin: '0 auto 20px' }} />

        <div style={{ fontWeight: 700, fontSize: 17, color: C.ink, marginBottom: 16 }}>Mark as Paid</div>

        {/* Member info */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: C.white, borderRadius: 10, padding: '12px', marginBottom: 20,
          border: `1px solid ${C.border}`,
        }}>
          <Avatar initials={member.initials} size={40} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{member.full_name}</div>
            <div style={{ fontSize: 13, color: C.muted }}>GHS {circle.contribution_amount || 200} · Cycle {circle.current_cycle || 1}</div>
          </div>
        </div>

        {/* MoMo ref input */}
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>
          MoMo Reference Number
        </label>
        <input
          value={momoRef}
          onChange={e => { setMomoRef(e.target.value); setError(''); }}
          placeholder="e.g. GHT-2024-XXXXXX"
          style={{
            width: '100%', padding: '13px 14px', borderRadius: 10, fontSize: 15,
            border: `1.5px solid ${error ? C.red : C.border}`,
            background: C.white, color: C.ink, outline: 'none', boxSizing: 'border-box', marginBottom: 4,
          }}
        />
        {error && <div style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>{error}</div>}

        <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>
          Enter the reference from the member's MoMo confirmation SMS.
        </div>

        {/* Buttons */}
        <button onClick={handleConfirm} disabled={saving} style={{
          width: '100%', background: saving ? C.border : C.gold, color: C.ink,
          border: 'none', borderRadius: 12, padding: '15px', fontSize: 16,
          fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', marginBottom: 10,
        }}>
          {saving ? 'Saving…' : '✓ Confirm Payment'}
        </button>
        <button onClick={onClose} style={{
          width: '100%', background: 'none', border: 'none', color: C.muted,
          fontSize: 14, cursor: 'pointer', padding: '8px',
        }}>Cancel</button>
      </div>
    </div>
  );
}