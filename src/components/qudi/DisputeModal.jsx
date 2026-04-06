import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { C } from '../../lib/qudiTokens';

const DISPUTE_TYPES = [
  { value: 'payment_status',         label: '💳 Incorrect payment status',  desc: 'My status is marked wrong' },
  { value: 'suspicious_transaction', label: '🚨 Suspicious transaction',    desc: 'I see an unauthorised or incorrect debit' },
  { value: 'missed_payout',          label: '📭 Missed payout',             desc: "I was due a payout but didn't receive it" },
];

const STATUS_OPTIONS = [
  { value: 'paid',    label: 'I already paid' },
  { value: 'pending', label: 'My payment is in progress' },
  { value: 'failed',  label: 'Payment failed on your end, not mine' },
];

export default function DisputeModal({ member, circle, onClose, onSubmitted }) {
  const [disputeType, setDisputeType] = useState('payment_status');
  const [claimed, setClaimed]         = useState('paid');
  const [txRef, setTxRef]             = useState('');
  const [flaggedAmt, setFlaggedAmt]   = useState('');
  const [description, setDesc]        = useState('');
  const [proofFile, setProofFile]     = useState(null);
  const [step, setStep]               = useState('form'); // form | uploading | done
  const [error, setError]             = useState('');

  const submit = async () => {
    if (!description.trim()) { setError('Please describe the issue.'); return; }
    setError('');
    setStep('uploading');

    let proof_url = null;
    if (proofFile) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: proofFile });
      proof_url = file_url;
    }

    await base44.entities.Dispute.create({
      circle_id:        circle.id || 'demo',
      member_id:        member.id,
      member_name:      member.full_name,
      dispute_type:     disputeType,
      reported_status:  member.payment_status,
      claimed_status:   disputeType === 'payment_status' ? claimed : undefined,
      transaction_ref:  txRef || undefined,
      flagged_amount:   flaggedAmt ? parseFloat(flaggedAmt) : undefined,
      description:      description.trim(),
      proof_url,
      status:           'open',
      escrow_held:      false,
      cycle:            circle.current_cycle || 1,
    });

    const typeLabel = DISPUTE_TYPES.find(t => t.value === disputeType)?.label || disputeType;
    await base44.entities.Notification.create({
      circle_id:   circle.id || 'demo',
      member_id:   member.id,
      member_name: member.full_name,
      message:     `⚠️ ${typeLabel} dispute filed by ${member.full_name}. ${txRef ? `Ref: ${txRef}.` : ''} ${description.trim()}`,
      status:      'sent',
      channel:     'in-app',
    });

    setStep('done');
    onSubmitted?.();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: C.cream, borderRadius: '18px 18px 0 0',
        width: '100%', maxWidth: 430, padding: '24px 20px 36px',
        maxHeight: '92dvh', overflowY: 'auto',
      }}>
        {step === 'done' ? (
          <div style={{ textAlign: 'center', paddingTop: 12 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 17, color: C.ink, marginBottom: 6 }}>Dispute Submitted</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
              Your dispute has been logged. The organiser will review evidence and may hold funds in escrow while investigating.
            </div>
            <button onClick={onClose} style={{
              width: '100%', background: C.ink, color: C.cream, border: 'none',
              borderRadius: 10, padding: '13px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ width: 36, height: 4, background: C.border, borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 4 }}>Flag an Issue</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
              Current status: <strong style={{ color: C.red }}>{member.payment_status?.toUpperCase()}</strong>
            </div>

            {/* Dispute type */}
            <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8 }}>TYPE OF ISSUE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {DISPUTE_TYPES.map(t => (
                <label key={t.value} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  background: disputeType === t.value ? C.amberBg : C.white,
                  border: `1px solid ${disputeType === t.value ? C.gold : C.border}`,
                  borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                }}>
                  <input type="radio" name="dtype" value={t.value} checked={disputeType === t.value}
                    onChange={() => setDisputeType(t.value)} style={{ accentColor: C.gold, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 13, color: C.ink, fontWeight: disputeType === t.value ? 700 : 400 }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{t.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Conditional fields */}
            {disputeType === 'payment_status' && (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>WHAT IS YOUR ACTUAL STATUS?</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {STATUS_OPTIONS.map(opt => (
                    <label key={opt.value} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: claimed === opt.value ? C.amberBg : C.white,
                      border: `1px solid ${claimed === opt.value ? C.gold : C.border}`,
                      borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                    }}>
                      <input type="radio" name="claimed" value={opt.value} checked={claimed === opt.value}
                        onChange={() => setClaimed(opt.value)} style={{ accentColor: C.gold }} />
                      <span style={{ fontSize: 13, color: C.ink, fontWeight: claimed === opt.value ? 600 : 400 }}>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </>
            )}

            {(disputeType === 'suspicious_transaction' || disputeType === 'missed_payout') && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>
                    {disputeType === 'suspicious_transaction' ? 'TRANSACTION REF' : 'EXPECTED PAYOUT REF'}
                  </div>
                  <input value={txRef} onChange={e => setTxRef(e.target.value)}
                    placeholder="MoMo ref / TX ID"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>AMOUNT (GHS)</div>
                  <input type="number" value={flaggedAmt} onChange={e => setFlaggedAmt(e.target.value)}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
            )}

            {/* Description */}
            <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>DESCRIBE THE ISSUE</div>
            <textarea value={description} onChange={e => setDesc(e.target.value)}
              placeholder="e.g. I paid on 3rd April via MoMo ref ABC123 but it's still showing as failed…"
              rows={3}
              style={{
                width: '100%', borderRadius: 8, border: `1px solid ${C.border}`,
                padding: '10px', fontSize: 13, fontFamily: 'inherit',
                background: C.white, color: C.ink, resize: 'none',
                boxSizing: 'border-box', marginBottom: 14,
              }} />

            {/* Proof upload */}
            <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>UPLOAD PROOF (OPTIONAL)</div>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: C.white, border: `1px dashed ${C.border}`,
              borderRadius: 8, padding: '10px 12px', cursor: 'pointer', marginBottom: 18,
            }}>
              <span style={{ fontSize: 18 }}>📎</span>
              <span style={{ fontSize: 13, color: proofFile ? C.ink : C.muted }}>
                {proofFile ? proofFile.name : 'Tap to attach screenshot or receipt'}
              </span>
              <input type="file" accept="image/*,application/pdf" hidden
                onChange={e => setProofFile(e.target.files[0] || null)} />
            </label>

            {error && <div style={{ color: C.red, fontSize: 12, marginBottom: 10 }}>{error}</div>}

            <button onClick={submit} disabled={step === 'uploading'} style={{
              width: '100%', background: step === 'uploading' ? C.border : C.ink,
              color: C.cream, border: 'none', borderRadius: 10,
              padding: '13px', fontWeight: 700, fontSize: 14,
              cursor: step === 'uploading' ? 'not-allowed' : 'pointer',
            }}>
              {step === 'uploading' ? 'Submitting…' : '🚩 Submit Dispute'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}