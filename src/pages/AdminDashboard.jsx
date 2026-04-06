import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = [C.gold, '#2A9D8F', '#E76F51', '#457B9D', '#8338EC'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [circles, setCircles] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [penalties, setPenalties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Circle.list('-created_date', 50),
      base44.entities.Transaction.list('-created_date', 200),
      base44.entities.Penalty.filter({ status: 'pending' }, '-created_date', 100),
    ]).then(([c, t, p]) => {
      setCircles(c);
      setTransactions(t);
      setPenalties(p);
      setLoading(false);
    });
  }, []);

  // --- Derived metrics ---
  const totalCircles = circles.length;
  const activeCircles = circles.filter(c => c.status === 'active').length;
  const totalContributions = transactions
    .filter(t => t.type === 'collection' && t.status === 'success')
    .reduce((s, t) => s + (t.amount || 0), 0);
  const totalPendingPenalties = penalties.reduce((s, p) => s + (p.penalty_amount || 0), 0);

  // Collection rate per cycle (group by cycle)
  const cycleMap = {};
  transactions.filter(t => t.type === 'collection').forEach(t => {
    const key = `Cycle ${t.cycle || 1}`;
    if (!cycleMap[key]) cycleMap[key] = { cycle: key, collected: 0, failed: 0 };
    if (t.status === 'success') cycleMap[key].collected += t.amount || 0;
    else cycleMap[key].failed += t.amount || 0;
  });
  const cycleData = Object.values(cycleMap).slice(-8);

  // Contributions per circle
  const circleContribMap = {};
  transactions.filter(t => t.type === 'collection' && t.status === 'success').forEach(t => {
    const cid = t.circle_id;
    const circle = circles.find(c => c.id === cid);
    const name = circle?.name || 'Unknown';
    circleContribMap[name] = (circleContribMap[name] || 0) + (t.amount || 0);
  });
  const circleContribData = Object.entries(circleContribMap)
    .map(([name, amount]) => ({ name: name.length > 14 ? name.slice(0, 14) + '…' : name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  // Circle status pie
  const statusPie = [
    { name: 'Active', value: circles.filter(c => c.status === 'active').length },
    { name: 'Forming', value: circles.filter(c => c.status === 'forming').length },
    { name: 'Completed', value: circles.filter(c => c.status === 'completed').length },
  ].filter(d => d.value > 0);

  // Penalty by circle
  const penaltyMap = {};
  penalties.forEach(p => {
    const name = p.circle_id || 'Unknown';
    penaltyMap[name] = (penaltyMap[name] || 0) + (p.penalty_amount || 0);
  });
  const penaltyData = Object.entries(penaltyMap)
    .map(([id, amount]) => {
      const circle = circles.find(c => c.id === id);
      return { name: (circle?.name || id).slice(0, 14), amount };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  const statCards = [
    { label: 'Total Circles', value: totalCircles, sub: `${activeCircles} active`, color: C.ink },
    { label: 'Total Collected', value: `GHS ${totalContributions.toLocaleString()}`, sub: 'all time', color: C.goldText },
    { label: 'Pending Penalties', value: `GHS ${totalPendingPenalties.toLocaleString()}`, sub: `${penalties.length} cases`, color: '#C0392B' },
    { label: 'Transactions', value: transactions.length, sub: 'all types', color: '#2A9D8F' },
  ];

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.ink }}>
        <Header dark title="Admin Dashboard" subtitle="Circle health overview" onBack={() => navigate('/dashboard')} />
        <KenteStripe height={3} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 80 }}>
        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 60, color: C.muted }}>Loading data…</div>
        ) : (
          <>
            {/* Quick Actions */}
            <Link to="/reconciliation" style={
              { display: 'block', textDecoration: 'none', background: C.ink, color: C.gold,
                borderRadius: 12, padding: '13px 16px', marginBottom: 14,
                fontWeight: 700, fontSize: 14, textAlign: 'center' }
            }>
              🔄 Run MoMo Reconciliation
            </Link>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {statCards.map(({ label, value, sub, color }) => (
                <div key={label} style={{ background: C.white, borderRadius: 12, padding: '14px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 4 }}>{label.toUpperCase()}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Collection per cycle */}
            <Section title="Collection per Cycle (GHS)">
              {cycleData.length === 0 ? <EmptyState /> : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={cycleData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="cycle" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={v => `GHS ${v}`} />
                    <Bar dataKey="collected" name="Collected" fill={C.gold} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="failed" name="Failed" fill="#E76F51" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Section>

            {/* Contributions per circle */}
            <Section title="Top Circles by Contributions">
              {circleContribData.length === 0 ? <EmptyState /> : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={circleContribData} layout="vertical" margin={{ top: 4, right: 4, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip formatter={v => `GHS ${v}`} />
                    <Bar dataKey="amount" fill={C.ink} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Section>

            {/* Circle status pie */}
            <Section title="Circle Status Breakdown">
              {statusPie.length === 0 ? <EmptyState /> : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={statusPie} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {statusPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Section>

            {/* Pending penalties */}
            <Section title="Pending Penalties by Circle (GHS)">
              {penaltyData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: C.muted, fontSize: 13 }}>✅ No pending penalties</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={penaltyData} layout="vertical" margin={{ top: 4, right: 4, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip formatter={v => `GHS ${v}`} />
                    <Bar dataKey="amount" fill="#C0392B" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
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
    <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 14, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 12 }}>{title.toUpperCase()}</div>
      {children}
    </div>
  );
}

function EmptyState() {
  return <div style={{ textAlign: 'center', padding: '20px', color: C.muted, fontSize: 13 }}>No data yet</div>;
}