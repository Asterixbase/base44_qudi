import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';
import Avatar from '../components/qudi/Avatar';
import { createReferral, rewardReferral, REFERRAL_REWARDS } from '../lib/referralEngine';

const STATUS_STYLE = {
  pending:  { bg: '#FFF8E1', color: '#856404', label: 'Pending' },
  joined:   { bg: '#E3F2FD', color: '#0D47A1', label: 'Joined'  },
  rewarded: { bg: '#D4EDDA', color: '#155724', label: 'Rewarded' },
};

export default function ReferralHub() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [circles, setCircles]     = useState([]);
  const [circle, setCircle]       = useState(state?.circle || null);
  const [members, setMembers]     = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [referrer, setReferrer]   = useState(null);
  const [form, setForm]           = useState({ email: '', name: '' });
  const [sending, setSending]     = useState(false);
  const [sent, setSent]           = useState(false);
  const [rewarding, setRewarding] = useState(null);

  useEffect(() => {
    base44.entities.Circle.filter({ status: 'active' }).then(setCircles);
  }, []);

  useEffect(() => {
    if (!circle) return;
    base44.entities.Member.filter({ circle_id: circle.id }).then(ms => {
      setMembers(ms);
      if (!referrer && ms.length) setReferrer(ms[0]);
    });
    base44.entities.Referral.filter({ circle_id: circle.id }, '-created_date', 50).then(setReferrals);
  }, [circle?.id]);

  const selectCircle = (id) => {
    const c = circles.find(x => x.id === id);
    setCircle(c || null);
    setReferrer(null);
    setReferrals([]);
    setSent(false);
  };

  const sendInvite = async () => {
    if (!form.email || !referrer || !circle) return;
    setSending(true);
    await createReferral({ circle, referrer, inviteeEmail: form.email, inviteeName: form.name });
    const updated = await base44.entities.Referral.filter({ circle_id: circle.id }, '-created_date', 50);
    setReferrals(updated);
    setForm({ email: '', name: '' });
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  const markJoinedAndReward = async (ref) => {
    setRewarding(ref.id);
    // Find referrer member
    const refMember = members.find(m => m.id === ref.referrer_id) || members[0];
    // Simulate invitee member (in real app, match by email)
    const inviteeMember = members.find(m => m.full_name === ref.invitee_name) || null;
    // Update status to joined first
    await base44.entities.Referral.update(ref.id, { status: 'joined' });
    if (refMember) {
      await rewardReferral({ referral: ref, referrerMember: refMember, inviteeMember, circle });
    }
    const updated = await base44.entities.Referral.filter({ circle_id: circle.id }, '-created_date', 50);
    setReferrals(updated);
    setRewarding(null);
  };

  const myReferrals = referrer ? referrals.filter(r => r.referrer_id === referrer.id) : referrals;
  const totalRewarded = referrals.filter(r => r.status === 'rewarded').length;

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.ink }}>
        <Header dark title="Referral Hub" subtitle="Invite members & earn rewards" onBack={() => navigate(-1)} />
        <KenteStripe height={3} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 80 }}>

        {/* Reward explainer */}
        <div style={{ background: C.ink, borderRadius: 12, padding: '14px', marginBottom: 16, display: 'flex', gap: 16 }}>
          <div style={{ flex: 1, textAlign: 'center', borderRight: `1px solid rgba(255,255,255,0.1)`, paddingRight: 16 }}>
            <div style={{ color: C.gold, fontWeight: 800, fontSize: 22 }}>+{REFERRAL_REWARDS.referrer.value}</div>
            <div style={{ color: C.hintOnDark, fontSize: 11, marginTop: 2 }}>Trust score</div>
            <div style={{ color: C.cream, fontSize: 12, fontWeight: 600, marginTop: 2 }}>You earn</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ color: C.gold, fontWeight: 800, fontSize: 22 }}>GHS {REFERRAL_REWARDS.invitee.value}</div>
            <div style={{ color: C.hintOnDark, fontSize: 11, marginTop: 2 }}>Contribution credit</div>
            <div style={{ color: C.cream, fontSize: 12, fontWeight: 600, marginTop: 2 }}>Friend earns</div>
          </div>
        </div>

        {/* Circle selector */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>SELECT CIRCLE</label>
          <select
            value={circle?.id || ''}
            onChange={e => selectCircle(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, fontSize: 14, color: C.ink }}
          >
            <option value="">— choose a circle —</option>
            {circles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {circle && members.length > 0 && (
          <>
            {/* Referrer selector */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>REFERRING AS</label>
              <select
                value={referrer?.id || ''}
                onChange={e => setReferrer(members.find(m => m.id === e.target.value) || null)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, fontSize: 14, color: C.ink }}
              >
                {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>

            {/* Invite form */}
            <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 10 }}>INVITE A FRIEND</div>
              <input
                placeholder="Friend's name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, marginBottom: 8, boxSizing: 'border-box' }}
              />
              <input
                placeholder="Friend's email address"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }}
              />
              <button
                onClick={sendInvite}
                disabled={sending || !form.email}
                style={{
                  width: '100%', padding: '12px', background: sent ? C.green : C.gold,
                  color: C.ink, border: 'none', borderRadius: 10,
                  fontSize: 14, fontWeight: 700, cursor: sending || !form.email ? 'default' : 'pointer',
                }}
              >
                {sending ? 'Sending…' : sent ? '✓ Invite Sent!' : '📨 Send Invite'}
              </button>
            </div>

            {/* Stats */}
            {referrals.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {[
                  { label: 'Total Invites', val: referrals.length },
                  { label: 'Joined',        val: referrals.filter(r => r.status !== 'pending').length },
                  { label: 'Rewarded',      val: totalRewarded },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, background: C.white, borderRadius: 10, padding: '10px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: 20, color: C.goldText }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Referral list */}
            {referrals.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8 }}>REFERRAL HISTORY</div>
                {referrals.map(r => {
                  const s = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
                  return (
                    <div key={r.id} style={{
                      background: C.white, borderRadius: 10, padding: '12px', marginBottom: 6,
                      border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <Avatar initials={(r.invitee_name || r.invitee_email || '?').slice(0, 2).toUpperCase()} size={36} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>{r.invitee_name || r.invitee_email}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Invited by {r.referrer_name}</div>
                        {r.reward_note && <div style={{ fontSize: 11, color: C.green, marginTop: 2 }}>{r.reward_note}</div>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span style={{ background: s.bg, color: s.color, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>{s.label}</span>
                        {r.status === 'pending' && (
                          <button
                            onClick={() => markJoinedAndReward(r)}
                            disabled={rewarding === r.id}
                            style={{
                              background: C.gold, color: C.ink, border: 'none', borderRadius: 6,
                              padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            {rewarding === r.id ? '…' : '✓ Mark Joined'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {referrals.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: C.muted }}>
                <div style={{ fontSize: 32 }}>📨</div>
                <div style={{ marginTop: 8, fontSize: 13 }}>No referrals yet — invite someone!</div>
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