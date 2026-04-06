/**
 * PenaltyBanner — shown in CircleDetail for members with overdue/failed status.
 * Allows organiser to trigger the penalty engine for a specific member.
 */
import { useState } from 'react';
import { C } from '../../lib/qudiTokens';
import { triggerPenalty, calcPenaltyAmount } from '../../lib/penaltyEngine';

export default function PenaltyBanner({ circle, member, daysLate = 1 }) {
  const [status, setStatus] = useState('idle'); // idle | applying | done | skipped
  const [penaltyRecord, setPenaltyRecord] = useState(null);

  if (!circle?.penalty_enabled) return null;
  if (!['failed', 'overdue'].includes(member?.payment_status)) return null;

  const previewAmount = calcPenaltyAmount(circle, circle.contribution_amount || 0, daysLate);
  if (previewAmount <= 0) return null;

  const trigger = async () => {
    setStatus('applying');
    const result = await triggerPenalty({ circle, member, daysLate });
    const record = result?.penalty;
    setPenaltyRecord(record);
    setStatus(record ? 'done' : 'skipped');
  };

  if (status === 'done') {
    return (
      <div style={{
        background: '#FCE4E4', border: `1px solid ${C.red}`, borderRadius: 10,
        padding: '12px 14px', marginBottom: 8,
      }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.red }}>⚠️ Penalty Applied</div>
        <div style={{ fontSize: 12, color: C.ink, marginTop: 4 }}>
          GHS <strong>{penaltyRecord?.penalty_amount}</strong> added to {member.full_name}'s account.
          {circle.penalty_notify_guarantor && member.guarantor_name && (
            <span> Guarantor <strong>{member.guarantor_name}</strong> notified.</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#FFF8E1', border: `1px solid ${C.gold}`, borderRadius: 10,
      padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.amberTx }}>
          Late penalty pending — {member.full_name}
        </div>
        <div style={{ fontSize: 12, color: C.ink, marginTop: 2 }}>
          GHS <strong>{previewAmount}</strong> ({circle.penalty_type?.replace('_', ' ')}) · {daysLate} day(s) late
        </div>
      </div>
      <button
        onClick={trigger}
        disabled={status === 'applying'}
        style={{
          background: C.red, color: C.white, border: 'none', borderRadius: 8,
          padding: '8px 14px', fontSize: 12, fontWeight: 700,
          cursor: status === 'applying' ? 'default' : 'pointer', flexShrink: 0,
        }}
      >
        {status === 'applying' ? '…' : 'Apply'}
      </button>
    </div>
  );
}