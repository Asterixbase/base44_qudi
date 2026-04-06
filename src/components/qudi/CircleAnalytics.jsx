import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { C } from '../../lib/qudiTokens';

// Mock historical contribution data per cycle
const CYCLE_DATA = [
  { cycle: 'C1', collected: 1000, target: 1000 },
  { cycle: 'C2', collected: 900,  target: 1000 },
  { cycle: 'C3', collected: 600,  target: 1000 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.ink, borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: C.hintOnDark, marginBottom: 4 }}>{label}</div>
      <div style={{ color: C.gold, fontWeight: 700 }}>GHS {payload[0]?.value}</div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Target: GHS {payload[0]?.payload?.target}</div>
    </div>
  );
};

export default function CircleAnalytics({ circle }) {
  const contribution = circle?.contribution_amount || 200;
  const maxMembers = circle?.max_members || 10;
  const currentCycle = circle?.current_cycle || 3;
  const potBalance = circle?.pot_balance || 1400;
  const frequency = circle?.frequency || 'monthly';

  const totalTarget = contribution * maxMembers;
  const cycleTarget = contribution * maxMembers; // per-cycle pot target
  const collectedPercent = Math.min(100, Math.round((potBalance / totalTarget) * 100));
  const cyclesLeft = maxMembers - currentCycle;
  const weeksPerCycle = frequency === 'weekly' ? 1 : 4;
  const daysLeft = cyclesLeft * weeksPerCycle * 7;
  const projectedDate = new Date(Date.now() + daysLeft * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div style={{ margin: '0 16px 16px', background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      {/* Section header */}
      <div style={{ padding: '14px 14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>Analytics</div>
        <span style={{ fontSize: 11, color: C.muted }}>Cycle {currentCycle} of {maxMembers}</span>
      </div>

      {/* Bar chart */}
      <div style={{ padding: '12px 4px 0' }}>
        <div style={{ fontSize: 11, color: C.muted, paddingLeft: 10, marginBottom: 6, fontWeight: 600 }}>CONTRIBUTIONS PER CYCLE (GHS)</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={CYCLE_DATA} barSize={28} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="cycle" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <ReferenceLine y={cycleTarget} stroke={C.gold} strokeDasharray="4 3" strokeWidth={1.5} />
            <Bar dataKey="collected" radius={[5, 5, 0, 0]}>
              {CYCLE_DATA.map((entry, i) => (
                <Cell key={i} fill={entry.collected >= entry.target ? C.green : i === CYCLE_DATA.length - 1 ? C.gold : C.amber} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 10, paddingBottom: 4, marginTop: -4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 20, height: 2, background: C.gold, borderRadius: 1 }} />
            <span style={{ fontSize: 10, color: C.muted }}>Target GHS {cycleTarget}</span>
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: C.border, margin: '8px 14px' }} />

      {/* Funds collected vs target */}
      <div style={{ padding: '0 14px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>TOTAL FUNDS COLLECTED</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>
              GHS {potBalance.toLocaleString()}
              <span style={{ fontSize: 13, fontWeight: 500, color: C.muted }}> / {totalTarget.toLocaleString()}</span>
            </div>
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: collectedPercent >= 80 ? C.green : C.amber }}>{collectedPercent}%</span>
        </div>
        <div style={{ height: 8, background: C.card, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4,
            background: collectedPercent >= 80 ? C.green : C.gold,
            width: `${collectedPercent}%`, transition: 'width 0.6s ease',
          }} />
        </div>

        <div style={{ height: 1, background: C.border, margin: '12px 0' }} />

        {/* Projected completion */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>PROJECTED COMPLETION</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginTop: 2 }}>{projectedDate}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>CYCLES LEFT</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginTop: 2 }}>{cyclesLeft}</div>
          </div>
        </div>
      </div>
    </div>
  );
}