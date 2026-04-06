import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';

const STATUS_STYLE = {
  pending:  { bg: '#FFF8E1', color: '#856404', label: 'PENDING' },
  viewed:   { bg: '#E3F2FD', color: '#1565C0', label: 'VIEWED' },
  joined:   { bg: '#D4EDDA', color: '#155724', label: 'JOINED' },
  expired:  { bg: '#F5F5F5', color: '#757575', label: 'EXPIRED' },
};

function genCode() {
  return Math.random().toString(36).substring(2, 9).toUpperCase();
}

function buildDeepLink(code) {
  return `${window.location.origin}/register?invite=${code}`;
}

function expiresAt(days = 7) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export default function InviteSystem() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [circles, setCircles] = useState([]);
  const [selectedCircle, setSelectedCircle] = useState(state?.circle || null);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [tab, setTab] = useState('create'); // create | list

  const [form, setForm] = useState({
    invitee_name: '',
    invitee_phone: '',
    invitee_email: '',
    guarantor_name: '',
    guarantor_phone: '',
    note: '',
  });

  useEffect(() => {
    base44.entities.Circle.list('-created_date', 30).then(c => {
      setCircles(c);
      if (!selectedCircle && c.length > 0) setSelectedCircle(state?.circle || c[0]);
    });
  }, []);

  useEffect(() => {
    if (selectedCircle?.id) {
      setLoading(true);
      base44.entities.Invitation.filter({ circle_id: selectedCircle.id }, '-created_date', 50)
        .then(inv => { setInvitations(inv); setLoading(false); });
    }
  }, [selectedCircle?.id]);

  const field = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const sendInvite = async () => {
    if (!selectedCircle) return;
    if (!form.invitee_phone && !form.invitee_email) return;
    setSending(true);

    const code = genCode();
    const deep_link = buildDeepLink(code);
    const smsMessage = `Hi${form.invitee_name ? ' ' + form.invitee_name : ''}! ${selectedCircle.name || 'A circle'} organiser has invited you to join their Qudi savings circle. Click to join: ${deep_link}`;

    const inv = await base44.entities.Invitation.create({
      circle_id:        selectedCircle.id,
      circle_name:      selectedCircle.name,
      organiser_name:   'Organiser',
      invitee_name:     form.invitee_name || '',
      invitee_phone:    form.invitee_phone || '',
      invitee_email:    form.invitee_email || '',
      invite_code:      code,
      deep_link,
      status:           'pending',
      guarantor_name:   form.guarantor_name || '',
      guarantor_phone:  form.guarantor_phone || '',
      guarantor_linked: !!form.guarantor_name,
      sms_sent:         !!form.invitee_phone,
      sms_log:          form.invitee_phone ? smsMessage : '',
      expires_at:       expiresAt(7),
      note:             form.note || '',
    });

    await base44.entities.Notification.create({
      circle_id:   selectedCircle.id,
      member_name: form.invitee_name || form.invitee_phone || 'Invitee',
      message:     `📨 Invitation sent to ${form.invitee_name || form.invitee_phone}. Code: ${code}`,
      status:      'sent',
      channel:     'in-app',
    });

    setInvitations(prev => [inv, ...prev]);
    setForm({ invitee_name: '', invitee_phone: '', invitee_email: '', guarantor_name: '', guarantor_phone: '', note: '' });
    setSending(false);
    setTab('list');
  };

  const markJoined = async (inv) => {
    await base44.entities.Invitation.update(inv.id, { status: 'joined' });
    setInvitations(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'joined' } : i));
  };

  const copyLink = (inv) => {
    navigator.clipboard.writeText(inv.deep_link).then(() => {
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const pendingCount = invitations.filter(i => i.status === 'pending').length;
  const joinedCount = invitations.filter(i => i.status === 'joined').length;

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.ink }}>
        <Header dark title="Invite Members" subtitle="Deep links · SMS · Guarantor tracking" onBack={() => navigate(-1)} />
        <KenteStripe height={3} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 80 }}>

        {/* Circle selector */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>CIRCLE</label>
          <select
            value={selectedCircle?.id || ''}
            onChange={e => setSelectedCircle(circles.find(c => c.id === e.target.value) || null)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, fontSize: 14, color: C.ink }}
          >
            <option value="">— select a circle —</option>
            {circles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {selectedCircle && (
          <>
            {/* Stats row */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Total Invited', value: invitations.length, color: C.ink },
                { label: 'Pending', value: pendingCount, color: '#856404' },
                { label: 'Joined', value: joinedCount, color: '#155724' },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: C.white, borderRadius: 10, padding: '10px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', background: C.white, borderRadius: 10, padding: 4, marginBottom: 16, border: `1px solid ${C.border}` }}>
              {['create', 'list'].map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                  background: tab === t ? C.ink : 'transparent',
                  color: tab === t ? C.cream : C.muted,
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}>
                  {t === 'create' ? '+ New Invite' : `Invitations (${invitations.length})`}
                </button>
              ))}
            </div>

            {tab === 'create' && (
              <div style={{ background: C.white, borderRadius: 12, padding: '16px', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 14 }}>Invite a New Member</div>

                <FormField label="FULL NAME (OPTIONAL)">
                  <input value={form.invitee_name} onChange={e => field('invitee_name', e.target.value)}
                    placeholder="e.g. Ama Boateng"
                    style={inputStyle} />
                </FormField>

                <FormField label="PHONE (FOR SMS)">
                  <input value={form.invitee_phone} onChange={e => field('invitee_phone', e.target.value)}
                    placeholder="+233 24 000 0000"
                    style={inputStyle} />
                </FormField>

                <FormField label="EMAIL (OPTIONAL)">
                  <input value={form.invitee_email} onChange={e => field('invitee_email', e.target.value)}
                    placeholder="email@example.com"
                    style={inputStyle} />
                </FormField>

                <div style={{ height: 1, background: C.border, margin: '14px 0' }} />
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 10 }}>GUARANTOR (OPTIONAL)</div>

                <FormField label="GUARANTOR NAME">
                  <input value={form.guarantor_name} onChange={e => field('guarantor_name', e.target.value)}
                    placeholder="Guarantor's full name"
                    style={inputStyle} />
                </FormField>

                <FormField label="GUARANTOR PHONE">
                  <input value={form.guarantor_phone} onChange={e => field('guarantor_phone', e.target.value)}
                    placeholder="+233 24 000 0000"
                    style={inputStyle} />
                </FormField>

                <FormField label="NOTE (OPTIONAL)">
                  <input value={form.note} onChange={e => field('note', e.target.value)}
                    placeholder="Any note for your records"
                    style={inputStyle} />
                </FormField>

                <button
                  onClick={sendInvite}
                  disabled={sending || (!form.invitee_phone && !form.invitee_email)}
                  style={{
                    width: '100%', padding: '13px', background: sending ? C.border : C.gold,
                    color: C.ink, border: 'none', borderRadius: 10,
                    fontWeight: 700, fontSize: 14, cursor: sending ? 'default' : 'pointer', marginTop: 8,
                  }}
                >
                  {sending ? 'Generating…' : '📨 Generate Link & Send Invite'}
                </button>
                <div style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 8 }}>
                  A unique deep link will be generated. If a phone is provided, an SMS will be logged.
                </div>
              </div>
            )}

            {tab === 'list' && (
              <div>
                {loading ? (
                  <div style={{ textAlign: 'center', color: C.muted, paddingTop: 40 }}>Loading…</div>
                ) : invitations.length === 0 ? (
                  <div style={{ textAlign: 'center', color: C.muted, paddingTop: 40 }}>No invitations yet. Create one!</div>
                ) : (
                  invitations.map(inv => {
                    const s = STATUS_STYLE[inv.status] || STATUS_STYLE.pending;
                    const expired = inv.expires_at && new Date(inv.expires_at) < new Date();
                    return (
                      <div key={inv.id} style={{
                        background: C.white, borderRadius: 12, padding: '14px',
                        marginBottom: 10, border: `1px solid ${C.border}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>
                              {inv.invitee_name || inv.invitee_phone || inv.invitee_email || 'Unknown'}
                            </div>
                            {inv.invitee_phone && <div style={{ fontSize: 12, color: C.muted }}>{inv.invitee_phone}</div>}
                          </div>
                          <span style={{ background: s.bg, color: s.color, borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700 }}>
                            {expired && inv.status === 'pending' ? 'EXPIRED' : s.label}
                          </span>
                        </div>

                        {inv.guarantor_name && (
                          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
                            🔗 Guarantor: <strong style={{ color: C.ink }}>{inv.guarantor_name}</strong>
                            {inv.guarantor_phone && ` · ${inv.guarantor_phone}`}
                            <span style={{ marginLeft: 6, color: inv.guarantor_linked ? '#155724' : C.muted }}>
                              {inv.guarantor_linked ? '✓ Linked' : '○ Pending'}
                            </span>
                          </div>
                        )}

                        {inv.invite_code && (
                          <div style={{ background: C.cream, borderRadius: 8, padding: '8px 10px', marginBottom: 8, fontSize: 12, color: C.ink, wordBreak: 'break-all' }}>
                            <strong>Code:</strong> {inv.invite_code}<br />
                            <span style={{ color: C.muted, fontSize: 11 }}>{inv.deep_link}</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => copyLink(inv)} style={{
                            flex: 1, padding: '8px', background: copiedId === inv.id ? '#D4EDDA' : C.cream,
                            color: copiedId === inv.id ? '#155724' : C.ink,
                            border: `1px solid ${C.border}`, borderRadius: 8,
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          }}>
                            {copiedId === inv.id ? '✓ Copied!' : '📋 Copy Link'}
                          </button>
                          {inv.status === 'pending' && (
                            <button onClick={() => markJoined(inv)} style={{
                              flex: 1, padding: '8px', background: '#D4EDDA', color: '#155724',
                              border: '1px solid #A8D5B5', borderRadius: 8,
                              fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            }}>
                              ✓ Mark Joined
                            </button>
                          )}
                        </div>

                        {inv.sms_log && (
                          <details style={{ marginTop: 8 }}>
                            <summary style={{ fontSize: 11, color: C.muted, cursor: 'pointer' }}>📱 View SMS preview</summary>
                            <div style={{ marginTop: 6, padding: '8px', background: '#F0F4FF', borderRadius: 6, fontSize: 11, color: C.ink, lineHeight: 1.5 }}>
                              {inv.sms_log}
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  })
                )}
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

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: `1px solid #DDD`, fontSize: 13, color: '#1A1A1A',
  background: '#FAFAFA', boxSizing: 'border-box',
};