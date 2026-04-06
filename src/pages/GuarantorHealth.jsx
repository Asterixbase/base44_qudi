import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { checkAdminRole } from '../lib/roleGuard';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';
import Avatar from '../components/qudi/Avatar';
import { getAllGuarantorHealth, flagGuarantor } from '../lib/guarantorHealthEngine';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function riskColor(level) {
  if (level === 'high') return '#DC2626';
  if (level === 'medium') return '#D97706';
  return '#16A34A';
}

function riskLabel(level) {
  if (level === 'high') return '🚩 High Risk';
  if (level === 'medium') return '⚠ Medium Risk';
  return '✅ Low Risk';
}

export default function GuarantorHealth() {
  const navigate = useNavigate();
  const [guarantors, setGuarantors] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [flagging, setFlagging] = useState(null);
  const [flagReason, setFlagReason] = useState('');
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    async function load() {
      const isAdmin = await checkAdminRole();
      if (!isAdmin) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      const data = await getAllGuarantorHealth();
      setGuarantors(data);
      if (data.length > 0) setSelected(data[0]);
      setLoading(false);
    }
    load();
  }, []);

  const highRiskCount = guarantors.filter(g => g.riskLevel === 'high').length;
  const mediumRiskCount = guarantors.filter(g => g.riskLevel === 'medium').length;

  const handleFlag = async (guarantor) => {
    setFlagging(guarantor.guarantorName);
    await flagGuarantor(guarantor.guarantorName, flagReason);
    setFlagging(null);
    setShowFlagForm(false);
    setFlagReason('');
    // Optionally refresh
  };

  if (accessDenied) {
    return (
      <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
        <div style={{ fontWeight: 700, color: C.ink, marginBottom: 6 }}>Admin access required</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, textAlign: 'center' }}>You don't have permission to view this dashboard.</div>
        <button onClick={() => navigate('/dashboard')} style={{ color: C.goldText, background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}>← Go back</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.ink }}>
        <Header dark title="Guarantor Health" subtitle="Aggregate risk assessment by guarantor" onBack={() => navigate('/admin')} />
        <KenteStripe height={3} />

        {/* Stats */}
        <div style={{ display: 'flex', padding: '10px 16px', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#DC2626', fontWeight: 800, fontSize: 18 }}>{highRiskCount}</div>
            <div style={{ color: C.hintOnDark, fontSize: 10 }}>High risk</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#D97706', fontWeight: 800, fontSize: 18 }}>{mediumRiskCount}</div>
            <div style={{ color: C.hintOnDark, fontSize: 10 }}>Medium risk</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#16A34A', fontWeight: 800, fontSize: 18 }}>{guarantors.length - highRiskCount - mediumRiskCount}</div>
            <div style={{ color: C.hintOnDark, fontSize: 10 }}>Low risk</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', paddingBottom: 90, display: 'grid', gridTemplateColumns: selected ? '1fr 1.2fr' : '1fr', gap: 10 }}>
        {/* Guarantor list */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8 }}>GUARANTORS ({guarantors.length})</div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 24, color: C.muted }}>Loading…</div>
          ) : guarantors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: C.muted, fontSize: 13 }}>No guarantors found.</div>
          ) : (
            guarantors.map(g => (
              <div
                key={g.guarantorName}
                onClick={() => setSelected(g)}
                style={{
                  background: selected?.guarantorName === g.guarantorName ? C.gold : C.white,
                  color: selected?.guarantorName === g.guarantorName ? C.ink : 'inherit',
                  borderRadius: 10, padding: '12px', marginBottom: 8, cursor: 'pointer',
                  border: `1px solid ${selected?.guarantorName === g.guarantorName ? C.goldText : C.border}`,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: riskColor(g.riskLevel), color: C.white,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 14, flexShrink: 0,
                  }}>
                    {g.riskScore}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }} title={g.guarantorName}>{g.guarantorName}</div>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>{g.memberCount} member{g.memberCount > 1 ? 's' : ''}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detailed view */}
        {selected && (
          <div>
            {/* Header card */}
            <div style={{ background: C.white, borderRadius: 12, padding: '16px', marginBottom: 10, border: `2px solid ${riskColor(selected.riskLevel)}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: riskColor(selected.riskLevel), color: C.white,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: 20, flexShrink: 0,
                }}>
                  {selected.riskScore}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: C.ink }}>{selected.guarantorName}</div>
                  <div style={{ fontSize: 12, color: riskColor(selected.riskLevel), fontWeight: 700, marginTop: 2 }}>
                    {riskLabel(selected.riskLevel)}
                  </div>
                </div>
              </div>

              {/* Metrics grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Members', value: selected.memberCount, color: C.ink },
                  { label: 'Avg Trust', value: `${selected.avgTrustScore}%`, color: riskColor(selected.riskLevel) },
                  { label: 'Payment Rate', value: `${selected.avgPaymentRate}%`, color: selected.avgPaymentRate >= 80 ? '#16A34A' : '#D97706' },
                  { label: 'Penalties', value: selected.totalPenalties, color: selected.totalPenalties === 0 ? '#16A34A' : '#DC2626' },
                  { label: 'Verified', value: selected.verifiedCount, color: '#0EA5E9' },
                  { label: 'Outstanding', value: `GHS ${selected.outstandingTotal.toLocaleString()}`, color: '#DC2626' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: C.cream, borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color }}>{value}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Flag button */}
              <button onClick={() => setShowFlagForm(!showFlagForm)} style={{
                width: '100%', marginTop: 12, padding: '10px', background: selected.riskLevel === 'high' ? '#FEE2E2' : C.cream,
                color: selected.riskLevel === 'high' ? '#DC2626' : C.muted,
                border: `1.5px solid ${selected.riskLevel === 'high' ? '#FECACA' : C.border}`,
                borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}>
                {selected.riskLevel === 'high' ? '🚩 Already Flagged' : '🚩 Flag as High Risk'}
              </button>

              {/* Flag form */}
              {showFlagForm && (
                <div style={{ marginTop: 12, padding: '10px', background: C.cream, borderRadius: 8 }}>
                  <textarea
                    placeholder="Reason for flagging (optional)"
                    value={flagReason}
                    onChange={e => setFlagReason(e.target.value)}
                    style={{
                      width: '100%', padding: '8px', borderRadius: 6, border: `1px solid ${C.border}`,
                      fontFamily: 'inherit', fontSize: 11, minHeight: 40, resize: 'none', marginBottom: 6,
                    }}
                  />
                  <button onClick={() => handleFlag(selected)} disabled={flagging} style={{
                    width: '100%', padding: '8px', background: flagging ? C.border : '#DC2626',
                    color: C.white, border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12,
                    cursor: flagging ? 'default' : 'pointer',
                  }}>
                    {flagging ? 'Flagging…' : 'Confirm Flag'}
                  </button>
                </div>
              )}
            </div>

            {/* Member breakdown chart */}
            <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 10, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 10 }}>MEMBER TRUST DISTRIBUTION</div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={selected.members.slice(0, 8)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={16}>
                  <XAxis hide />
                  <YAxis hide />
                  <Tooltip formatter={(v) => `${v}%`} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                  <Bar dataKey="trustScore" radius={[4, 4, 0, 0]}>
                    {selected.members.slice(0, 8).map((m, i) => (
                      <Cell key={i} fill={m.trustScore >= 80 ? '#16A34A' : m.trustScore >= 60 ? '#D97706' : '#DC2626'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>
                {selected.members.filter(m => m.trustScore >= 80).length} excellent · {selected.members.filter(m => m.trustScore >= 60 && m.trustScore < 80).length} good · {selected.members.filter(m => m.trustScore < 60).length} at-risk
              </div>
            </div>

            {/* Member list */}
            <div style={{ background: C.white, borderRadius: 12, padding: '14px', border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 10 }}>GUARANTEED MEMBERS ({selected.memberCount})</div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {selected.members.map(m => (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
                    borderBottom: `1px solid ${C.border}`, fontSize: 11,
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', background: riskColor(m.trustScore >= 80 ? 'low' : m.trustScore >= 60 ? 'medium' : 'high'),
                      color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 10, flexShrink: 0,
                    }}>
                      {m.trustScore}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: C.ink }} title={m.full_name}>{m.full_name}</div>
                      <div style={{ color: C.muted }}>Pay rate: {m.paymentRate}% · Penalties: {m.penaltyCount}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430 }}>
        <NavBar />
      </div>
    </div>
  );
}