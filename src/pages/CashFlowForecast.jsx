import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

const FORECAST_CYCLES = 4; // how many future cycles to predict

function memberReliability(memberId, transactions) {
  const memberTxs = transactions.filter(t => t.member_id === memberId && t.type === 'collection');
  if (memberTxs.length === 0) return 0.7; // default assumption
  const paid = memberTxs.filter(t => t.status === 'success').length;
  return paid / memberTxs.length;
}

function forecastCircle(circle, members, transactions) {
  const currentCycle = circle.current_cycle || 1;
  const contrib = circle.contribution_amount || 0;
  const memberCount = members.length || circle.max_members || 1;
  const grossPot = contrib * memberCount;

  // Reliability per member
  const reliabilities = members.map(m => memberReliability(m.id, transactions));
  const avgReliability = reliabilities.length
    ? reliabilities.reduce((a, b) => a + b, 0) / reliabilities.length
    : 0.7;

  // Historical collection rate this circle (past successful collections / expected)
  const pastCollections = transactions.filter(t => t.type === 'collection' && t.status === 'success');
  const historicalRate = pastCollections.length > 0
    ? Math.min(1, pastCollections.reduce((s, t) => s + (t.amount || 0), 0) / Math.max(1, (currentCycle - 1) * grossPot || grossPot))
    : avgReliability;

  const blendedRate = (historicalRate * 0.6 + avgReliability * 0.4);

  // Forecast future cycles
  const cycles = Array.from({ length: FORECAST_CYCLES }, (_, i) => {
    const cycleNum = currentCycle + i;
    const projected = Math.round(grossPot * blendedRate);
    const shortfall = grossPot - projected;
    const atRisk = blendedRate < 0.75;
    return { cycleNum, projected, grossPot, shortfall: Math.max(0, shortfall), atRisk };
  });

  return { circle, blendedRate, cycles, grossPot, avgReliability, historicalRate };
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.ink, color: C.cream, borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Cycle {label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>GHS {(p.value || 0).toLocaleString()} {p.name}</div>
      ))}
    </div>
  );
};

export default function CashFlowForecast() {
  const navigate = useNavigate();
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // selected circle index

  useEffect(() => {
    async function load() {
      const circles = await base44.entities.Circle.filter({ status: 'active' }, '-created_date', 30);
      const results = await Promise.all(circles.map(async (circle) => {
        const [members, transactions] = await Promise.all([
          base44.entities.Member.filter({ circle_id: circle.id }),
          base44.entities.Transaction.filter({ circle_id: circle.id }, '-created_date', 200),
        ]);
        return forecastCircle(circle, members, transactions);
      }));
      setForecasts(results);
      if (results.length > 0) setSelected(0);
      setLoading(false);
    }
    load();
  }, []);

  const fc = selected !== null ? forecasts[selected] : null;
  const atRiskCircles = forecasts.filter(f => f.blendedRate < 0.75).length;
  const healthyCircles = forecasts.filter(f => f.blendedRate >= 0.9).length;

  const rateColor = (rate) => {
    if (rate >= 0.9) return '#16A34A';
    if (rate >= 0.75) return '#D97706';
    return '#DC2626';
  };

  const rateLabel = (rate) => {
    if (rate >= 0.9) return 'Healthy';
    if (rate >= 0.75) return 'Watch';
    return 'At Risk';
  };

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.ink }}>
        <Header dark title="Cash Flow Forecast" subtitle="AI-assisted collection projections" onBack={() => navigate(-1)} />
        <KenteStripe height={3} />

        {/* Summary stats */}
        <div style={{ display: 'flex', padding: '12px 16px 16px', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: C.gold, fontWeight: 800, fontSize: 20 }}>{forecasts.length}</div>
            <div style={{ color: C.hintOnDark, fontSize: 10 }}>Active Circles</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#86EFAC', fontWeight: 800, fontSize: 20 }}>{healthyCircles}</div>
            <div style={{ color: C.hintOnDark, fontSize: 10 }}>Healthy</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#F87171', fontWeight: 800, fontSize: 20 }}>{atRiskCircles}</div>
            <div style={{ color: C.hintOnDark, fontSize: 10 }}>At Risk</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: C.gold, fontWeight: 800, fontSize: 20 }}>{FORECAST_CYCLES}</div>
            <div style={{ color: C.hintOnDark, fontSize: 10 }}>Cycles ahead</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', paddingBottom: 80 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>Building forecasts…</div>
        ) : forecasts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>No active circles to forecast.</div>
        ) : (
          <>
            {/* Circle selector cards */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8 }}>SELECT CIRCLE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {forecasts.map((f, i) => {
                  const rc = rateColor(f.blendedRate);
                  const rl = rateLabel(f.blendedRate);
                  const isSelected = selected === i;
                  return (
                    <div key={f.circle.id} onClick={() => setSelected(i)} style={{
                      background: isSelected ? C.ink : C.white,
                      border: `1.5px solid ${isSelected ? C.gold : C.border}`,
                      borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: isSelected ? C.cream : C.ink }}>{f.circle.name}</div>
                        <div style={{ fontSize: 11, color: isSelected ? C.hintOnDark : C.muted, marginTop: 2 }}>
                          Cycle {f.circle.current_cycle || 1} · {f.circle.max_members} members · GHS {f.circle.contribution_amount?.toLocaleString()}/cycle
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 16, color: rc }}>{Math.round(f.blendedRate * 100)}%</div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 6px',
                          background: f.blendedRate >= 0.9 ? '#DCFCE7' : f.blendedRate >= 0.75 ? '#FEF3C7' : '#FEE2E2',
                          color: rc,
                        }}>{rl}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed forecast for selected circle */}
            {fc && (
              <>
                {/* Reliability breakdown */}
                <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 14, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 12 }}>RELIABILITY MODEL</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { label: 'Historical Rate', value: `${Math.round(fc.historicalRate * 100)}%`, color: rateColor(fc.historicalRate) },
                      { label: 'Member Avg', value: `${Math.round(fc.avgReliability * 100)}%`, color: rateColor(fc.avgReliability) },
                      { label: 'Blended', value: `${Math.round(fc.blendedRate * 100)}%`, color: rateColor(fc.blendedRate) },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ flex: 1, textAlign: 'center', background: C.cream, borderRadius: 8, padding: '10px 6px' }}>
                        <div style={{ fontWeight: 800, fontSize: 18, color }}>{value}</div>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 10, padding: '8px', background: C.cream, borderRadius: 8 }}>
                    Blended = 60% historical transactions + 40% member payment track records
                  </div>
                </div>

                {/* Chart */}
                <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 14, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 12 }}>
                    PROJECTED COLLECTIONS — NEXT {FORECAST_CYCLES} CYCLES
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={fc.cycles} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={28}>
                      <XAxis dataKey="cycleNum" tick={{ fontSize: 11, fill: C.muted }} tickFormatter={v => `C${v}`} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={fc.grossPot} stroke={C.border} strokeDasharray="4 2" label={{ value: 'Target', fontSize: 10, fill: C.muted, position: 'right' }} />
                      <Bar dataKey="projected" name="Projected" radius={[4, 4, 0, 0]}>
                        {fc.cycles.map((c, i) => (
                          <Cell key={i} fill={c.atRisk ? '#F87171' : c.projected >= c.grossPot * 0.9 ? '#4ADE80' : '#FCD34D'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8, justifyContent: 'center' }}>
                    {[['#4ADE80','≥ 90% funded'],['#FCD34D','75–89% funded'],['#F87171','< 75% (at risk)']].map(([bg, lbl]) => (
                      <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: C.muted }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: bg }} />{lbl}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cycle-by-cycle table */}
                <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 14, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 10 }}>CYCLE BREAKDOWN</div>
                  {fc.cycles.map((c, i) => {
                    const funded = c.projected / c.grossPot;
                    const statusColor = rateColor(funded);
                    const statusLabel = rateLabel(funded);
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                        borderBottom: i < fc.cycles.length - 1 ? `1px solid ${C.border}` : 'none',
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                          background: c.atRisk ? '#FEE2E2' : '#DCFCE7',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: 12, color: statusColor,
                        }}>C{c.cycleNum}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>Cycle {c.cycleNum}</div>
                          <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                            <div style={{ height: '100%', width: `${Math.round(funded * 100)}%`, background: statusColor, borderRadius: 3 }} />
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>GHS {c.projected.toLocaleString()}</div>
                          <div style={{ fontSize: 10, color: C.muted }}>of GHS {c.grossPot.toLocaleString()}</div>
                          {c.shortfall > 0 && (
                            <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 600 }}>⚠ −GHS {c.shortfall.toLocaleString()}</div>
                          )}
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 6px', flexShrink: 0,
                          background: funded >= 0.9 ? '#DCFCE7' : funded >= 0.75 ? '#FEF3C7' : '#FEE2E2',
                          color: statusColor,
                        }}>{statusLabel}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Recommendation */}
                <div style={{
                  borderRadius: 12, padding: '14px',
                  background: fc.blendedRate < 0.75 ? '#FEE2E2' : fc.blendedRate < 0.9 ? '#FEF3C7' : '#DCFCE7',
                  border: `1px solid ${fc.blendedRate < 0.75 ? '#FECACA' : fc.blendedRate < 0.9 ? '#FCD34D' : '#86EFAC'}`,
                  marginBottom: 14,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.ink, marginBottom: 6 }}>
                    {fc.blendedRate < 0.75 ? '⚠️ Action Required' : fc.blendedRate < 0.9 ? '⏳ Monitor Closely' : '✅ On Track'}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                    {fc.blendedRate < 0.75
                      ? `${fc.circle.name} has a low collection rate of ${Math.round(fc.blendedRate * 100)}%. Recommend sending reminders, enabling auto-penalties, or reviewing member trust scores before the next payout.`
                      : fc.blendedRate < 0.9
                      ? `${fc.circle.name} is collecting at ${Math.round(fc.blendedRate * 100)}%. Watch closely and consider proactive reminders for members with low reliability scores.`
                      : `${fc.circle.name} is performing well at ${Math.round(fc.blendedRate * 100)}% collection rate. Payouts should proceed without shortfalls.`}
                  </div>
                </div>
              </>
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