import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';
import Avatar from '../components/qudi/Avatar';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts';

/* ── helpers ─────────────────────────────────────────── */
function calcTrustScore(transactions, penalties, member) {
  const collections = transactions.filter(t => t.type === 'collection');
  const paid = collections.filter(t => t.status === 'success').length;
  const total = collections.length || 1;
  const paymentRate = paid / total; // 0-1

  const penaltyCount = penalties.length;
  const penaltyDeduction = Math.min(30, penaltyCount * 5);

  const baseScore = Math.round(paymentRate * 80) - penaltyDeduction + (member.is_verified ? 10 : 0);
  return Math.max(0, Math.min(100, baseScore));
}

function scoreColor(s) {
  if (s >= 80) return '#16A34A';
  if (s >= 60) return '#D97706';
  return '#DC2626';
}
function scoreLabel(s) {
  if (s >= 80) return 'Excellent';
  if (s >= 60) return 'Good';
  if (s >= 40) return 'Fair';
  return 'Poor';
}

const STATUS_COLOR = { success: '#16A34A', pending: '#D97706', failed: '#DC2626' };

/* ── main component ───────────────────────────────────── */
export default function MemberProfile() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const member = state?.member;

  const [transactions, setTransactions] = useState([]);
  const [penalties, setPenalties] = useState([]);
  const [circle, setCircle] = useState(state?.circle || null);
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState(member?.is_verified !== false);
  const [savingElig, setSavingElig] = useState(false);
  const [savedElig, setSavedElig] = useState(false);

  useEffect(() => {
    if (!member) { setLoading(false); return; }
    async function load() {
      const [txs, pens] = await Promise.all([
        base44.entities.Transaction.filter({ member_id: member.id }, '-created_date', 100),
        base44.entities.PenaltyLedger.filter({ member_id: member.id }, '-created_date', 50),
      ]);
      setTransactions(txs);
      setPenalties(pens);
      if (!circle && member.circle_id) {
        const circles = await base44.entities.Circle.filter({ id: member.circle_id });
        if (circles.length) setCircle(circles[0]);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (!member) {
    return (
      <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
        <div style={{ fontWeight: 700, color: C.ink }}>No member selected</div>
        <button onClick={() => navigate(-1)} style={{ marginTop: 12, color: C.goldText, background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}>← Go back</button>
      </div>
    );
  }

  const trustScore = loading ? null : calcTrustScore(transactions, penalties, member);
  const collections = transactions.filter(t => t.type === 'collection');
  const paid = collections.filter(t => t.status === 'success').length;
  const paymentRate = collections.length ? Math.round((paid / collections.length) * 100) : 0;
  const totalContributed = collections.filter(t => t.status === 'success').reduce((s, t) => s + (t.amount || 0), 0);
  const outstandingPenalties = penalties.filter(p => p.settlement_status === 'outstanding').reduce((s, p) => s + (p.penalty_amount || 0), 0);

  // Group collections by cycle for bar chart
  const cycleData = {};
  collections.forEach(t => {
    const key = `C${t.cycle || '?'}`;
    if (!cycleData[key]) cycleData[key] = { cycle: key, amount: 0, status: t.status };
    if (t.status === 'success') cycleData[key].amount += (t.amount || 0);
    if (t.status === 'failed') cycleData[key].status = 'failed';
  });
  const barData = Object.values(cycleData).slice(-8);

  const radarData = [
    { subject: 'Payment Rate', value: paymentRate },
    { subject: 'Consistency', value: Math.min(100, collections.length * 10) },
    { subject: 'No Penalties', value: Math.max(0, 100 - penalties.length * 15) },
    { subject: 'KYC', value: member.is_verified ? 100 : 0 },
    { subject: 'Longevity', value: Math.min(100, (member.joined_cycles_ago || 0) * 10) },
  ];

  const saveEligibility = async () => {
    setSavingElig(true);
    await base44.entities.Member.update(member.id, { is_verified: eligibility });
    setSavingElig(false);
    setSavedElig(true);
    setTimeout(() => setSavedElig(false), 2000);
  };

  const tc = trustScore !== null ? scoreColor(trustScore) : C.muted;

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: C.ink }}>
        <Header dark title="Member Profile" subtitle={circle?.name || 'Circle member'} onBack={() => navigate(-1)} />
        <KenteStripe height={3} />

        {/* Identity card */}
        <div style={{ padding: '16px 16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar initials={member.initials || member.full_name?.slice(0, 2).toUpperCase()} size={56} bg={tc} color={C.white} />
          <div style={{ flex: 1 }}>
            <div style={{ color: C.cream, fontWeight: 800, fontSize: 18 }}>{member.full_name}</div>
            <div style={{ color: C.hintOnDark, fontSize: 12, marginTop: 2 }}>{member.phone || 'No phone'}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {member.is_verified && <span style={{ background: C.tealBg, color: C.tealTx, fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 6px' }}>✓ KYC Verified</span>}
              {member.is_organiser && <span style={{ background: C.gold, color: C.ink, fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 6px' }}>Organiser</span>}
            </div>
          </div>
          {/* Trust score ring */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              border: `4px solid ${tc}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', background: 'rgba(255,255,255,0.05)',
            }}>
              <div style={{ fontWeight: 900, fontSize: 18, color: tc, lineHeight: 1 }}>
                {loading ? '–' : trustScore}
              </div>
            </div>
            <div style={{ color: C.hintOnDark, fontSize: 10, marginTop: 4 }}>
              {loading ? '…' : scoreLabel(trustScore)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', paddingBottom: 90 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>Loading profile…</div>
        ) : (
          <>
            {/* Key stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
              {[
                { label: 'Payment Rate', value: `${paymentRate}%`, color: scoreColor(paymentRate) },
                { label: 'Total Paid', value: `GHS ${totalContributed.toLocaleString()}`, color: C.ink },
                { label: 'Penalties', value: outstandingPenalties > 0 ? `GHS ${outstandingPenalties.toLocaleString()}` : 'None', color: outstandingPenalties > 0 ? '#DC2626' : '#16A34A' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: C.white, borderRadius: 10, padding: '12px 10px', textAlign: 'center', border: `1px solid ${C.border}` }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color }}>{value}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Trust score breakdown */}
            <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4 }}>TRUST SCORE BREAKDOWN</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ flex: 1, height: 12, background: C.border, borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${trustScore}%`, background: tc, borderRadius: 6, transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontWeight: 900, fontSize: 20, color: tc, minWidth: 36 }}>{trustScore}</div>
              </div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
                Calculated from: payment success rate (80pts) + KYC verification (+10pts) − penalty count (−5pts each), capped 0–100.
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <RadarChart data={radarData} margin={{ top: 8, right: 20, bottom: 8, left: 20 }}>
                  <PolarGrid stroke={C.border} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: C.muted }} />
                  <Radar dataKey="value" stroke={tc} fill={tc} fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Contribution history chart */}
            <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 12 }}>CONTRIBUTION HISTORY (GHS)</div>
              {barData.length === 0 ? (
                <div style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: '20px 0' }}>No contribution data yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={barData} margin={{ top: 0, right: 0, left: -24, bottom: 0 }} barSize={22}>
                    <XAxis dataKey="cycle" tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => [`GHS ${v}`, 'Amount']} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C.border}` }} />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {barData.map((d, i) => (
                        <Cell key={i} fill={d.status === 'failed' ? '#FCA5A5' : d.amount === 0 ? C.border : C.gold} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Penalty history */}
            <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 10 }}>PENALTY HISTORY ({penalties.length})</div>
              {penalties.length === 0 ? (
                <div style={{ color: '#16A34A', fontSize: 13, fontWeight: 600 }}>✅ No penalties on record</div>
              ) : (
                penalties.slice(0, 5).map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < Math.min(penalties.length, 5) - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Cycle {p.cycle || '–'} · {p.penalty_type || 'penalty'}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{p.days_late ? `${p.days_late} days late` : ''} {p.note || ''}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#DC2626' }}>GHS {p.penalty_amount?.toLocaleString()}</div>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                        background: p.settlement_status === 'settled' ? '#DCFCE7' : p.settlement_status === 'waived' ? '#F3F4F6' : '#FEE2E2',
                        color: p.settlement_status === 'settled' ? '#16A34A' : p.settlement_status === 'waived' ? C.muted : '#DC2626',
                      }}>{p.settlement_status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Eligibility control */}
            <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 14, border: `1.5px solid ${eligibility ? '#86EFAC' : '#FECACA'}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8 }}>CIRCLE INVITATION ELIGIBILITY</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
                Admins can restrict this member from being invited to new circles based on their trust score and payment history.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <button onClick={() => setEligibility(true)} style={{
                  flex: 1, padding: '10px', borderRadius: 8, fontWeight: 700, fontSize: 13,
                  background: eligibility ? '#DCFCE7' : C.cream, color: eligibility ? '#16A34A' : C.muted,
                  border: `2px solid ${eligibility ? '#86EFAC' : C.border}`, cursor: 'pointer',
                }}>✅ Eligible</button>
                <button onClick={() => setEligibility(false)} style={{
                  flex: 1, padding: '10px', borderRadius: 8, fontWeight: 700, fontSize: 13,
                  background: !eligibility ? '#FEE2E2' : C.cream, color: !eligibility ? '#DC2626' : C.muted,
                  border: `2px solid ${!eligibility ? '#FECACA' : C.border}`, cursor: 'pointer',
                }}>🚫 Restricted</button>
              </div>
              {trustScore < 40 && eligibility && (
                <div style={{ fontSize: 11, color: '#D97706', background: '#FEF3C7', borderRadius: 6, padding: '8px', marginBottom: 10 }}>
                  ⚠ This member has a low trust score ({trustScore}). Consider restricting eligibility.
                </div>
              )}
              <button onClick={saveEligibility} disabled={savingElig} style={{
                width: '100%', padding: '12px', background: savingElig ? C.border : C.ink,
                color: C.cream, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: savingElig ? 'default' : 'pointer',
              }}>
                {savingElig ? 'Saving…' : savedElig ? '✓ Saved!' : 'Save Eligibility'}
              </button>
            </div>

            {/* Guarantor info */}
            {member.guarantor_name && (
              <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 14, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8 }}>GUARANTOR</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{member.guarantor_name}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Linked as financial guarantor for this member</div>
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