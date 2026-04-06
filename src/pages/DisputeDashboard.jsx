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
  resolved:     { label: 'Resolved',     bg: '#D4EDDA', color: '#155724', icon: '✅' },
  rejected:     { label: 'Rejected',     bg: '#FCE4E4', color: '#721C24', icon: '❌' },
};

const FILTERS = ['all', 'open', 'under_review', 'resolved', 'rejected'];

export default function DisputeDashboard() {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [organiserNotes, setOrganiserNotes] = useState({});

  useEffect(() => {
    base44.entities.Dispute.list('-created_date', 100).then(data => {
      setDisputes(data);
      setLoading(false);
    });
  }, []);

  const filtered = filter === 'all' ? disputes : disputes.filter(d => d.status === filter);

  const updateStatus = async (dispute, newStatus) => {
    setUpdating(dispute.id);
    const note = organiserNotes[dispute.id] || '';

    await base44.entities.Dispute.update(dispute.id, {
      status: newStatus,
      organiser_note: note || undefined,
    });

    // On resolution: correct member payment status + trust score via Notification
    if (newStatus === 'resolved') {
      // Log correction notification
      await base44.entities.Notification.create({
        circle_id:   dispute.circle_id,
        member_id:   dispute.member_id,
        member_name: dispute.member_name,
        message:     `✅ Your dispute has been resolved. Your payment status has been updated to "${dispute.claimed_status}". Trust score corrected accordingly.`,
        status:      'sent',
        channel:     'in-app',
      });

      // Update member payment status + recalculate trust score
      if (dispute.member_id) {
        const members = await base44.entities.Member.filter({ circle_id: dispute.circle_id });
        const member = members.find(m => m.id === dispute.member_id);
        if (member) {
          const fakeResolved = { ...member, payment_status: dispute.claimed_status };
          const { score } = calcTrustScore(fakeResolved);
          await base44.entities.Member.update(dispute.member_id, {
            payment_status: dispute.claimed_status,
            trust_score: score,
          });
        }
      }
    }

    if (newStatus === 'rejected') {
      await base44.entities.Notification.create({
        circle_id:   dispute.circle_id,
        member_id:   dispute.member_id,
        member_name: dispute.member_name,
        message:     `❌ Your dispute was reviewed and rejected. ${note ? 'Reason: ' + note : 'Please contact the organiser for more details.'}`,
        status:      'sent',
        channel:     'in-app',
      });
    }

    setDisputes(prev => prev.map(d => d.id === dispute.id ? { ...d, status: newStatus, organiser_note: note } : d));
    setUpdating(null);
    setExpanded(null);
  };

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.ink }}>
        <Header dark title="Dispute Dashboard" subtitle="Organiser view — all submitted disputes" onBack={() => navigate('/dashboard')} />
        <KenteStripe height={3} />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 16px', overflowX: 'auto', background: C.white, borderBottom: `1px solid ${C.border}` }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            flexShrink: 0,
            background: filter === f ? C.ink : C.cream,
            color: filter === f ? C.gold : C.muted,
            border: `1px solid ${filter === f ? C.ink : C.border}`,
            borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            {f === 'all' ? 'All' : STATUS_META[f]?.label}
            {f !== 'all' && <span style={{ marginLeft: 4, opacity: 0.7 }}>
              ({disputes.filter(d => d.status === f).length})
            </span>}
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
            const isActionable = d.status === 'open' || d.status === 'under_review';

            return (
              <div key={d.id} style={{
                background: C.white, borderRadius: 12, marginBottom: 10,
                border: `1px solid ${d.status === 'open' ? C.gold : C.border}`,
                overflow: 'hidden',
              }}>
                {/* Row */}
                <div
                  onClick={() => setExpanded(isOpen ? null : d.id)}
                  style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}
                >
                  <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{meta.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{d.member_name}</span>
                      <span style={{ background: meta.bg, color: meta.color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                        {meta.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                      Shows <strong style={{ color: C.red }}>{d.reported_status?.toUpperCase()}</strong> → claims <strong style={{ color: C.green }}>{d.claimed_status?.toUpperCase()}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {d.description}
                    </div>
                  </div>
                  <div style={{ fontSize: 16, color: C.muted, flexShrink: 0, marginTop: 4 }}>{isOpen ? '▲' : '▼'}</div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px' }}>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}>MEMBER DESCRIPTION</div>
                    <div style={{ fontSize: 13, color: C.ink, marginBottom: 14, lineHeight: 1.5 }}>{d.description || '—'}</div>

                    {d.proof_url && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 6 }}>PROOF OF PAYMENT</div>
                        <a href={d.proof_url} target="_blank" rel="noreferrer" style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: C.cream, border: `1px solid ${C.border}`, borderRadius: 8,
                          padding: '8px 12px', fontSize: 13, color: C.ink, textDecoration: 'none', fontWeight: 600,
                        }}>📎 View uploaded proof</a>
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
                        <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 6 }}>ORGANISER NOTE (OPTIONAL)</div>
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

                        <div style={{ display: 'flex', gap: 8 }}>
                          {d.status === 'open' && (
                            <button onClick={() => updateStatus(d, 'under_review')} disabled={!!updating} style={{
                              flex: 1, background: '#E3F2FD', color: '#0D47A1',
                              border: '1px solid #90CAF9', borderRadius: 8, padding: '10px',
                              fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            }}>🔍 Start Review</button>
                          )}
                          <button onClick={() => updateStatus(d, 'resolved')} disabled={!!updating} style={{
                            flex: 1, background: C.greenBg, color: C.green,
                            border: `1px solid ${C.green}`, borderRadius: 8, padding: '10px',
                            fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          }}>✅ Resolve</button>
                          <button onClick={() => updateStatus(d, 'rejected')} disabled={!!updating} style={{
                            flex: 1, background: '#FCE4E4', color: '#721C24',
                            border: '1px solid #F5C6CB', borderRadius: 8, padding: '10px',
                            fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          }}>❌ Reject</button>
                        </div>

                        {updating === d.id && (
                          <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 10 }}>Updating…</div>
                        )}
                      </>
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