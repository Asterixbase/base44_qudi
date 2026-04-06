import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';
import { calcTrustScore } from '../lib/trustScore';

const STATUS_META = {
  open:         { label: 'Open',         bg: '#FFF8E1', color: '#856404', icon: '🔔' },
  under_review: { label: 'Under Review', bg: '#E3F2FD', color: '#0D47A1', icon: '🔍' },
  escrow_held:  { label: 'Escrow Held',  bg: '#EDE7F6', color: '#4527A0', icon: '🔒' },
  resolved:     { label: 'Resolved',     bg: '#D4EDDA', color: '#155724', icon: '✅' },
  rejected:     { label: 'Rejected',     bg: '#FCE4E4', color: '#721C24', icon: '❌' },
};

const TYPE_LABEL = {
  payment_status:         '💳 Payment Status',
  suspicious_transaction: '🚨 Suspicious Tx',
  missed_payout:          '📭 Missed Payout',
};

const FILTERS = ['all', 'open', 'under_review', 'escrow_held', 'resolved', 'rejected'];

export default function DisputeDashboard() {
  const navigate = useNavigate();
  const [disputes, setDisputes]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('all');
  const [expanded, setExpanded]       = useState(null);
  const [updating, setUpdating]       = useState(null);
  const [organiserNotes, setOrganiserNotes] = useState({});
  const [escrowAmts, setEscrowAmts]   = useState({});

  useEffect(() => {
    base44.entities.Dispute.list('-created_date', 100).then(data => {
      setDisputes(data);
      setLoading(false);
    });
  }, []);

  const reload = () =>
    base44.entities.Dispute.list('-created_date', 100).then(setDisputes);

  // ── escrow hold ────────────────────────────────────────────────────────────
  const holdEscrow = async (dispute) => {
    setUpdating(dispute.id);
    const amt = parseFloat(escrowAmts[dispute.id] || dispute.flagged_amount || 0);
    await base44.entities.Dispute.update(dispute.id, {
      status: 'escrow_held',
      escrow_held: true,
      escrow_amount: amt,
      organiser_note: organiserNotes[dispute.id] || undefined,
    });
    // Create a pending "hold" transaction for audit trail
    if (dispute.circle_id && amt > 0) {
      await base44.entities.Transaction.create({
        circle_id:   dispute.circle_id,
        member_id:   dispute.member_id,
        member_name: dispute.member_name,
        type:        'collection',
        amount:      amt,
        status:      'pending',
        note:        `🔒 Dispute escrow hold — pending review. Dispute ID: ${dispute.id}`,
        cycle:       dispute.cycle || 1,
      });
    }
    await base44.entities.Notification.create({
      circle_id:   dispute.circle_id,
      member_id:   dispute.member_id,
      member_name: dispute.member_name,
      message:     `🔒 GHS ${amt} has been placed in escrow while your dispute is under review. You will be notified of the outcome. — Qudi`,
      status:      'sent',
      channel:     'in-app',
    });
    await reload();
    setUpdating(null);
    setExpanded(null);
  };

  // ── resolve: release funds to member ─────────────────────────────────────
  const resolveDispute = async (dispute) => {
    setUpdating(dispute.id);
    const note = organiserNotes[dispute.id] || '';
    await base44.entities.Dispute.update(dispute.id, {
      status:        'resolved',
      escrow_held:   false,
      organiser_note: note || undefined,
      resolution:    'funds_released',
    });

    // Update member payment/trust if status dispute
    if (dispute.member_id && dispute.dispute_type === 'payment_status' && dispute.claimed_status) {
      const members = await base44.entities.Member.filter({ circle_id: dispute.circle_id });
      const member = members.find(m => m.id === dispute.member_id);
      if (member) {
        const { score } = calcTrustScore({ ...member, payment_status: dispute.claimed_status });
        await base44.entities.Member.update(dispute.member_id, {
          payment_status: dispute.claimed_status,
          trust_score: score,
        });
      }
    }

    // Release escrow as a payout transaction if funds were held
    if (dispute.escrow_held && dispute.escrow_amount > 0 && dispute.circle_id) {
      await base44.entities.Transaction.create({
        circle_id:   dispute.circle_id,
        member_id:   dispute.member_id,
        member_name: dispute.member_name,
        type:        'payout',
        amount:      dispute.escrow_amount,
        status:      'success',
        note:        `✅ Escrow released — dispute resolved in member's favour.`,
        cycle:       dispute.cycle || 1,
      });
    }

    await base44.entities.Notification.create({
      circle_id:   dispute.circle_id,
      member_id:   dispute.member_id,
      member_name: dispute.member_name,
      message:     `✅ Your dispute has been resolved in your favour.${dispute.escrow_amount > 0 ? ` GHS ${dispute.escrow_amount} has been released back to you.` : ''} ${note ? 'Note: ' + note : ''} — Qudi`,
      status:      'sent',
      channel:     'in-app',
    });

    await reload();
    setUpdating(null);
    setExpanded(null);
  };

  // ── reject: penalise offending party ─────────────────────────────────────
  const rejectDispute = async (dispute) => {
    setUpdating(dispute.id);
    const note = organiserNotes[dispute.id] || '';
    await base44.entities.Dispute.update(dispute.id, {
      status:        'rejected',
      escrow_held:   false,
      organiser_note: note || undefined,
      resolution:    'penalty_applied',
    });

    // Apply a penalty record for false/frivolous dispute
    const penaltyAmt = dispute.flagged_amount ? Math.round(dispute.flagged_amount * 0.05) : 10;
    await base44.entities.Penalty.create({
      circle_id:      dispute.circle_id,
      member_id:      dispute.member_id,
      member_name:    dispute.member_name,
      cycle:          dispute.cycle || 1,
      type:           'flat_fee',
      original_amount: dispute.flagged_amount || 0,
      penalty_amount:  penaltyAmt,
      days_late:       0,
      status:          'pending',
      member_notified: true,
      note:            `Penalty for rejected dispute (${dispute.dispute_type}). ${note}`,
    });

    // If escrow was held, return to pot (create a successful collection tx)
    if (dispute.escrow_held && dispute.escrow_amount > 0 && dispute.circle_id) {
      await base44.entities.Transaction.create({
        circle_id:   dispute.circle_id,
        member_id:   dispute.member_id,
        member_name: dispute.member_name,
        type:        'collection',
        amount:      dispute.escrow_amount,
        status:      'success',
        note:        `🔒 Escrow returned to pot — dispute rejected.`,
        cycle:       dispute.cycle || 1,
      });
    }

    await base44.entities.Notification.create({
      circle_id:   dispute.circle_id,
      member_id:   dispute.member_id,
      member_name: dispute.member_name,
      message:     `❌ Your dispute was reviewed and rejected. A GHS ${penaltyAmt} penalty has been applied to your account. ${note ? 'Reason: ' + note : ''} — Qudi`,
      status:      'sent',
      channel:     'in-app',
    });

    await reload();
    setUpdating(null);
    setExpanded(null);
  };

  const filtered = filter === 'all' ? disputes : disputes.filter(d => d.status === filter);
  const openCount = disputes.filter(d => d.status === 'open').length;

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.ink }}>
        <Header dark title="Dispute Centre" subtitle={`Admin panel · ${openCount} open dispute${openCount !== 1 ? 's' : ''}`} onBack={() => navigate('/dashboard')} />
        <KenteStripe height={3} />

        {/* Summary strip */}
        <div style={{ display: 'flex', padding: '10px 16px 14px', gap: 0 }}>
          {[
            { label: 'Total',        val: disputes.length },
            { label: 'Escrow held',  val: disputes.filter(d => d.escrow_held).length },
            { label: 'Resolved',     val: disputes.filter(d => d.status === 'resolved').length },
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

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 16px', overflowX: 'auto', background: C.white, borderBottom: `1px solid ${C.border}` }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            flexShrink: 0,
            background: filter === f ? C.ink : C.cream,
            color: filter === f ? C.gold : C.muted,
            border: `1px solid ${filter === f ? C.ink : C.border}`,
            borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            {f === 'all' ? 'All' : STATUS_META[f]?.label}
            {f !== 'all' && (
              <span style={{ marginLeft: 4, opacity: 0.7 }}>
                ({disputes.filter(d => d.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', paddingBottom: 80 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>Loading disputes…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🕊️</div>
            <div style={{ fontWeight: 700, color: C.ink, fontSize: 15 }}>No disputes here</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>All clear for this filter.</div>
          </div>
        ) : (
          filtered.map(d => {
            const meta = STATUS_META[d.status] || STATUS_META.open;
            const isOpen = expanded === d.id;
            const isActionable = ['open', 'under_review', 'escrow_held'].includes(d.status);

            return (
              <div key={d.id} style={{
                background: C.white, borderRadius: 12, marginBottom: 10,
                border: `1.5px solid ${d.status === 'open' ? C.gold : d.status === 'escrow_held' ? '#7C3AED' : C.border}`,
                overflow: 'hidden',
              }}>
                {/* Escrow banner */}
                {d.escrow_held && (
                  <div style={{ background: '#EDE7F6', padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🔒</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#4527A0' }}>
                      GHS {d.escrow_amount?.toLocaleString() || 0} held in escrow
                    </span>
                  </div>
                )}

                {/* Row */}
                <div onClick={() => setExpanded(isOpen ? null : d.id)}
                  style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{meta.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{d.member_name}</span>
                      <span style={{ background: meta.bg, color: meta.color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                        {meta.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2, fontWeight: 600 }}>
                      {TYPE_LABEL[d.dispute_type] || '🚩 Dispute'}
                      {d.flagged_amount > 0 && <span style={{ marginLeft: 8 }}>· GHS {d.flagged_amount?.toLocaleString()}</span>}
                    </div>
                    {d.dispute_type === 'payment_status' && (
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                        Shows <strong style={{ color: C.red }}>{d.reported_status?.toUpperCase()}</strong> → claims <strong style={{ color: C.green }}>{d.claimed_status?.toUpperCase()}</strong>
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {d.description}
                    </div>
                  </div>
                  <div style={{ fontSize: 16, color: C.muted, flexShrink: 0, marginTop: 4 }}>{isOpen ? '▲' : '▼'}</div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px' }}>

                    {/* Evidence */}
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}>MEMBER DESCRIPTION</div>
                    <div style={{ fontSize: 13, color: C.ink, marginBottom: 12, lineHeight: 1.5 }}>{d.description || '—'}</div>

                    {d.transaction_ref && (
                      <div style={{ background: C.cream, borderRadius: 8, padding: '8px 12px', marginBottom: 12, border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>TRANSACTION REF</div>
                        <div style={{ fontSize: 13, color: C.ink, fontWeight: 700, marginTop: 2 }}>{d.transaction_ref}</div>
                      </div>
                    )}

                    {d.proof_url && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 6 }}>EVIDENCE</div>
                        <a href={d.proof_url} target="_blank" rel="noreferrer" style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: C.cream, border: `1px solid ${C.border}`, borderRadius: 8,
                          padding: '8px 12px', fontSize: 13, color: C.ink, textDecoration: 'none', fontWeight: 600,
                        }}>📎 View proof</a>
                      </div>
                    )}

                    {d.organiser_note && (
                      <div style={{ marginBottom: 14, background: C.amberBg, borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 4 }}>PREVIOUS NOTE</div>
                        <div style={{ fontSize: 13, color: C.ink }}>{d.organiser_note}</div>
                      </div>
                    )}

                    {isActionable && (
                      <>
                        <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 6 }}>ORGANISER NOTE</div>
                        <textarea
                          value={organiserNotes[d.id] || ''}
                          onChange={e => setOrganiserNotes(n => ({ ...n, [d.id]: e.target.value }))}
                          placeholder="Add a note to the member about your decision…"
                          rows={2}
                          style={{
                            width: '100%', borderRadius: 8, border: `1px solid ${C.border}`,
                            padding: '8px 10px', fontSize: 13, fontFamily: 'inherit',
                            background: C.cream, color: C.ink, resize: 'none',
                            boxSizing: 'border-box', marginBottom: 12,
                          }}
                        />

                        {/* Escrow amount input (if not yet held) */}
                        {!d.escrow_held && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 6 }}>ESCROW AMOUNT (GHS)</div>
                            <input
                              type="number"
                              value={escrowAmts[d.id] ?? (d.flagged_amount || '')}
                              onChange={e => setEscrowAmts(a => ({ ...a, [d.id]: e.target.value }))}
                              placeholder="Amount to hold"
                              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, boxSizing: 'border-box' }}
                            />
                          </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {/* Row 1: review + escrow */}
                          <div style={{ display: 'flex', gap: 8 }}>
                            {d.status === 'open' && (
                              <button onClick={async () => {
                                setUpdating(d.id);
                                await base44.entities.Dispute.update(d.id, { status: 'under_review' });
                                await reload(); setUpdating(null); setExpanded(null);
                              }} disabled={!!updating} style={{
                                flex: 1, background: '#E3F2FD', color: '#0D47A1',
                                border: '1px solid #90CAF9', borderRadius: 8, padding: '10px',
                                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                              }}>🔍 Start Review</button>
                            )}
                            {!d.escrow_held && (
                              <button onClick={() => holdEscrow(d)} disabled={!!updating} style={{
                                flex: 1, background: '#EDE7F6', color: '#4527A0',
                                border: '1px solid #B39DDB', borderRadius: 8, padding: '10px',
                                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                              }}>🔒 Hold Escrow</button>
                            )}
                          </div>
                          {/* Row 2: resolve + reject */}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => resolveDispute(d)} disabled={!!updating} style={{
                              flex: 1, background: C.greenBg, color: C.green,
                              border: `1px solid ${C.green}`, borderRadius: 8, padding: '10px',
                              fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            }}>✅ Resolve & Release</button>
                            <button onClick={() => rejectDispute(d)} disabled={!!updating} style={{
                              flex: 1, background: '#FCE4E4', color: '#721C24',
                              border: '1px solid #F5C6CB', borderRadius: 8, padding: '10px',
                              fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            }}>❌ Reject & Penalise</button>
                          </div>
                        </div>

                        {updating === d.id && (
                          <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 10 }}>Updating…</div>
                        )}
                      </>
                    )}

                    {/* Resolution note */}
                    {!isActionable && d.resolution && (
                      <div style={{ background: d.status === 'resolved' ? C.greenBg : '#FCE4E4', borderRadius: 8, padding: '10px 12px', marginTop: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: d.status === 'resolved' ? C.green : '#721C24' }}>
                          {d.resolution === 'funds_released' ? '✅ Funds released to member' : '❌ Penalty applied to member'}
                        </div>
                      </div>
                    )}
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