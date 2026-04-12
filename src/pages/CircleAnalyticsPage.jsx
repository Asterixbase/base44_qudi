import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';

/* ── helpers ── */
function avg(arr) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0; }
function fmt(n) { return Number(n).toLocaleString(); }

function buildPotGrowth(transactions, circle) {
  const sorted = [...transactions]
    .filter(t => t.type === 'in' || t.type === 'out')
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  let running = 0;
  const points = [];
  sorted.forEach(tx => {
    running += tx.type === 'in' ? (tx.quantity || 0) : -(tx.quantity || 0);
    const label = new Date(tx.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    points.push({ date: label, balance: Math.max(0, running) });
  });
  // deduplicate by date — keep last
  const map = {};
  points.forEach(p => { map[p.date] = p; });
  return Object.values(map);
}

function buildPaymentLatency(members, transactions) {
  return members.map(m => {
    const memberTxs = transactions.filter(t => t.product_id === m.id && t.type === 'in');
    // Latency: days between consecutive "in" transactions vs expected frequency
    const latencies = memberTxs.slice(0, -1).map((t, i) => {
      const next = memberTxs[i + 1];
      return Math.round((new Date(next.created_date) - new Date(t.created_date)) / 86400000);
    });
    const avgLatency = latencies.length ? avg(latencies) : null;
    return {
      name: m.full_name.split(' ')[0],
      avgDays: avgLatency !== null ? Math.round(avgLatency) : 0,
      payments: memberTxs.length,
      status: m.payment_status,
    };
  }).filter(m => m.payments > 0).sort((a, b) => b.avgDays - a.avgDays);
}

/* ── main component ── */
export default function CircleAnalyticsPage() {
  const navigate   = useNavigate();
  const { state }  = useLocation();
  const preCircle  = state?.circle || null;

  const [circles, setCircles]       = useState([]);
  const [selectedId, setSelectedId] = useState(preCircle?.id || null);
  const [circle, setCircle]         = useState(preCircle);
  const [members, setMembers]       = useState([]);
  const [transactions, setTx]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [projecting, setProjecting] = useState(false);
  const [projection, setProjection] = useState(null);
  const [projError, setProjError]   = useState(null);

  // Load circles list
  useEffect(() => {
    base44.entities.Circle.list('-created_date', 50).then(data => {
      setCircles(data);
      if (!selectedId && data.length > 0) setSelectedId(data[0].id);
      setLoading(false);
    });
  }, []);

  // Load circle data when selection changes
  useEffect(() => {
    if (!selectedId) return;
    setProjection(null);
    const found = circles.find(c => c.id === selectedId);
    if (found) setCircle(found);

    Promise.all([
      base44.entities.Member.filter({ circle_id: selectedId }),
      base44.entities.Transaction.filter({ circle_id: selectedId }),
    ]).then(([m, tx]) => {
      setMembers(m);
      setTx(tx);
    });
  }, [selectedId, circles]);

  const runProjection = async () => {
    if (!circle) return;
    setProjecting(true);
    setProjError(null);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        prompt: `You are a financial analyst for a Ghanaian savings circle (Susu/Tontine).
Circle: ${circle.name}
Frequency: ${circle.frequency} | Contribution: GHS ${circle.contribution_amount} | Members: ${circle.max_members || members.length}
Current cycle: ${circle.current_cycle || 1} | Members paid this cycle: ${members.filter(m => m.payment_status === 'paid').length}
Total transactions: ${transactions.length}
Member payment statuses: ${members.map(m => m.full_name + ':' + m.payment_status).join(', ')}

Based on this data, predict:
1. Estimated completion date for the CURRENT cycle (when all members will have paid)
2. Estimated date for 3 future cycles beyond the current one
3. Likelihood % that current cycle completes on time
4. Key risk factors
5. A short actionable recommendation for the organiser`,
        response_json_schema: {
          type: 'object',
          properties: {
            current_cycle_completion: { type: 'string' },
            future_cycles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  cycle: { type: 'number' },
                  estimated_date: { type: 'string' },
                  confidence: { type: 'string' },
                },
              },
            },
            on_time_likelihood_pct: { type: 'number' },
            risk_factors: { type: 'array', items: { type: 'string' } },
            recommendation: { type: 'string' },
          },
        },
      });
      setProjection(result);
    } catch (e) {
      setProjError(e.message);
    } finally {
      setProjecting(false);
    }
  };

  const potData   = buildPotGrowth(transactions, circle);
  const latency   = buildPaymentLatency(members, transactions);
  const paidCount = members.filter(m => m.payment_status === 'paid').length;
  const totalTarget = (circle?.contribution_amount || 0) * (circle?.max_members || members.length);
  const collected = transactions.filter(t => t.type === 'in').reduce((s, t) => s + (t.quantity || 0), 0);
  const collectionRate = members.length > 0 ? Math.round((paidCount / members.length) * 100) : 0;

  const latencyColors = { paid: C.green, pending: '#EBA020', failed: C.red, overdue: C.red };

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: C.ink }}>
        <Header dark title="Circle Analytics" subtitle="Cycle health & projections" onBack={() => navigate(-1)} />
        <KenteStripe height={3} />

        {/* Circle selector */}
        <div style={{ padding: '10px 16px 14px' }}>
          <select
            value={selectedId || ''}
            onChange={e => setSelectedId(e.target.value)}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.1)', color: C.gold,
              border: `1px solid rgba(235,160,32,0.4)`, borderRadius: 10,
              padding: '10px 12px', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
            }}
          >
            {circles.map(c => (
              <option key={c.id} value={c.id} style={{ background: C.ink, color: C.cream }}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', paddingBottom: 80 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>Loading…</div>
        ) : !circle ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>No circles found.</div>
        ) : (
          <>
            {/* KPI strip */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Cycle', value: `#${circle.current_cycle || 1}`, sub: circle.frequency },
                { label: 'Collection Rate', value: `${collectionRate}%`, sub: `${paidCount}/${members.length} paid` },
                { label: 'Pot Balance', value: `GHS ${fmt(circle.pot_balance || 0)}`, sub: `target GHS ${fmt(totalTarget)}` },
                { label: 'Total Collected', value: `GHS ${fmt(collected)}`, sub: `${transactions.filter(t=>t.type==='in').length} payments` },
              ].map((k, i) => (
                <div key={i} style={{ background: C.white, borderRadius: 12, padding: '14px 16px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{k.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>{k.value}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Pot Growth Chart */}
            <Section title="📈 Pot Growth Over Time">
              {potData.length < 2 ? (
                <Empty>Not enough transaction data yet.</Empty>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={potData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#EBA020" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#EBA020" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.muted }} />
                    <YAxis tick={{ fontSize: 10, fill: C.muted }} />
                    <Tooltip
                      contentStyle={{ background: C.ink, border: 'none', borderRadius: 8, color: C.cream, fontSize: 12 }}
                      formatter={v => [`GHS ${fmt(v)}`, 'Balance']}
                    />
                    <Area type="monotone" dataKey="balance" stroke="#EBA020" fill="url(#goldGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Section>

            {/* Payment Latency */}
            <Section title="⏱ Payment Latency (avg days between payments)">
              {latency.length === 0 ? (
                <Empty>No payment data available yet.</Empty>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={latency} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.muted }} />
                      <YAxis tick={{ fontSize: 10, fill: C.muted }} unit="d" />
                      <Tooltip
                        contentStyle={{ background: C.ink, border: 'none', borderRadius: 8, color: C.cream, fontSize: 12 }}
                        formatter={v => [`${v} days`, 'Avg latency']}
                      />
                      <ReferenceLine
                        y={circle.frequency === 'weekly' ? 7 : 30}
                        stroke="#EBA020" strokeDasharray="4 4"
                        label={{ value: 'Due', fill: '#EBA020', fontSize: 10 }}
                      />
                      <Bar dataKey="avgDays" radius={[4, 4, 0, 0]}
                        fill={C.ink}
                        label={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    {latency.map((m, i) => (
                      <span key={i} style={{
                        background: m.avgDays > (circle.frequency === 'weekly' ? 7 : 30) ? '#FCE4E4' : '#D4EDDA',
                        color: m.avgDays > (circle.frequency === 'weekly' ? 7 : 30) ? '#721C24' : '#155724',
                        borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600,
                      }}>
                        {m.name}: {m.avgDays}d
                      </span>
                    ))}
                  </div>
                </>
              )}
            </Section>

            {/* Member payment status breakdown */}
            <Section title="👥 Member Status Breakdown">
              {['paid', 'pending', 'overdue', 'failed'].map(status => {
                const count = members.filter(m => m.payment_status === status).length;
                const pct   = members.length ? Math.round((count / members.length) * 100) : 0;
                const colors = { paid: C.green, pending: '#EBA020', overdue: C.red, failed: '#8B1A1A' };
                return (
                  <div key={status} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.ink, textTransform: 'capitalize' }}>{status}</span>
                      <span style={{ fontSize: 12, color: colors[status], fontWeight: 700 }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: colors[status], borderRadius: 4, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                );
              })}
            </Section>

            {/* AI Predictive Projections */}
            <Section title="🔮 Predictive Cycle Projections">
              {!projection ? (
                <div style={{ textAlign: 'center', paddingBottom: 4 }}>
                  <p style={{ fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
                    Use AI to estimate cycle completion dates and surface risks before they become problems.
                  </p>
                  {projError && (
                    <div style={{ background: '#FCE4E4', color: '#721C24', borderRadius: 8, padding: '8px 12px', fontSize: 12, marginBottom: 12 }}>
                      ⚠️ {projError}
                    </div>
                  )}
                  <button
                    onClick={runProjection}
                    disabled={projecting}
                    style={{
                      background: projecting ? C.muted : C.ink, color: C.gold,
                      border: `1px solid ${C.gold}`, borderRadius: 10,
                      padding: '12px 24px', fontSize: 13, fontWeight: 800,
                      cursor: projecting ? 'not-allowed' : 'pointer', width: '100%',
                    }}
                  >
                    {projecting ? '⏳ Analysing…' : '✨ Generate AI Projections'}
                  </button>
                </div>
              ) : (
                <>
                  {/* Likelihood */}
                  <div style={{ background: projection.on_time_likelihood_pct >= 70 ? '#D4EDDA' : projection.on_time_likelihood_pct >= 40 ? '#FFF8E1' : '#FCE4E4', borderRadius: 10, padding: '12px 16px', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 4 }}>On-Time Completion Likelihood</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: C.ink }}>{projection.on_time_likelihood_pct}%</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Current cycle estimated: <strong>{projection.current_cycle_completion}</strong></div>
                  </div>

                  {/* Future cycles */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 8 }}>Future Cycle Forecasts</div>
                    {(projection.future_cycles || []).map((fc, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: C.white, borderRadius: 8, marginBottom: 6, border: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Cycle {fc.cycle}</span>
                        <span style={{ fontSize: 13, color: C.muted }}>{fc.estimated_date}</span>
                        <span style={{ fontSize: 11, background: '#E3F0FF', color: '#1A4F8A', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>{fc.confidence}</span>
                      </div>
                    ))}
                  </div>

                  {/* Risk factors */}
                  {(projection.risk_factors || []).length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 6 }}>Risk Factors</div>
                      {projection.risk_factors.map((r, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#721C24', background: '#FCE4E4', borderRadius: 6, padding: '6px 10px', marginBottom: 4 }}>
                          ⚠️ {r}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recommendation */}
                  {projection.recommendation && (
                    <div style={{ background: '#FFF8E1', border: `1px solid #EBA020`, borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#856404', marginBottom: 4 }}>💡 ORGANISER RECOMMENDATION</div>
                      <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.5 }}>{projection.recommendation}</div>
                    </div>
                  )}

                  <button
                    onClick={runProjection}
                    disabled={projecting}
                    style={{
                      marginTop: 12, background: 'transparent', color: C.muted,
                      border: `1px solid ${C.border}`, borderRadius: 8,
                      padding: '8px 16px', fontSize: 12, cursor: 'pointer', width: '100%',
                    }}
                  >
                    {projecting ? '⏳ Re-analysing…' : '🔄 Refresh Projections'}
                  </button>
                </>
              )}
            </Section>
          </>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430 }}>
        <NavBar />
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: C.white, borderRadius: 14, padding: '16px', marginBottom: 12, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

function Empty({ children }) {
  return <div style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: '16px 0' }}>{children}</div>;
}