import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';

const STATUS_STYLE = {
  active:    { bg: C.greenBg, color: C.greenTx, label: 'Active' },
  forming:   { bg: C.amberBg, color: C.amberTx, label: 'Forming' },
  completed: { bg: C.tealBg,  color: C.tealTx,  label: 'Completed' },
};

const DEMO_CIRCLES = [
  { id: 'c1', name: 'Kantamanto Traders', contribution_amount: 200, max_members: 10, current_cycle: 3, pot_balance: 1400, status: 'active', frequency: 'Monthly', is_insured: true },
  { id: 'c2', name: 'Accra Market Women', contribution_amount: 150, max_members: 8,  current_cycle: 1, pot_balance: 300,  status: 'forming', frequency: 'Weekly',  is_insured: false },
  { id: 'c3', name: 'Tech Circle GH',     contribution_amount: 500, max_members: 6,  current_cycle: 5, pot_balance: 0,    status: 'completed', frequency: 'Monthly', is_insured: true },
];

export default function Home() {
  const navigate = useNavigate();
  const [circles, setCircles] = useState(DEMO_CIRCLES);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => {});
    base44.entities.Circle.list('-created_date', 20)
      .then(data => { if (data?.length) setCircles(data); })
      .catch(() => {});
  }, []);

  const totalPot = circles.filter(c => c.status === 'active').reduce((s, c) => s + (c.pot_balance || 0), 0);
  const activeCount = circles.filter(c => c.status === 'active').length;
  const initials = user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'ME';

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ background: C.ink }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px' }}>
          <div>
            <div style={{ color: C.gold, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Qudi</div>
            <div style={{ color: C.hintOnDark, fontSize: 12 }}>
              {user?.full_name ? `Welcome, ${user.full_name.split(' ')[0]}` : 'My Circles'}
            </div>
          </div>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: C.gold,
            color: C.ink, fontWeight: 800, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{initials}</div>
        </div>
        <KenteStripe height={3} />

        {/* Summary bar */}
        <div style={{ display: 'flex', gap: 0, padding: '14px 16px 18px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.hintOnDark, fontSize: 11, marginBottom: 2 }}>Total in escrow</div>
            <div style={{ color: C.gold, fontSize: 24, fontWeight: 800 }}>GHS {totalPot.toLocaleString()}</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '0 16px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ color: C.hintOnDark, fontSize: 11, marginBottom: 2 }}>Active circles</div>
            <div style={{ color: C.white, fontSize: 24, fontWeight: 800 }}>{activeCount}</div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 80 }}>
        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { label: '+ New Circle', to: '/circles', bg: C.gold, color: C.ink },
            { label: '🤝 Join Circle', to: '/invitations', bg: C.ink, color: C.cream },
            { label: '📊 Reports', to: '/cash-flow', bg: C.tealBg, color: C.tealTx },
          ].map(a => (
            <Link key={a.label} to={a.to} style={{
              flex: 1, background: a.bg, color: a.color, borderRadius: 10,
              padding: '11px 6px', textAlign: 'center', fontWeight: 700, fontSize: 12,
              textDecoration: 'none', display: 'block',
            }}>{a.label}</Link>
          ))}
        </div>

        {/* Circles list */}
        <div style={{ fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 10 }}>My Circles</div>
        {circles.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.muted, paddingTop: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🫂</div>
            <div style={{ fontWeight: 600 }}>No circles yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Create or join a money circle to get started</div>
          </div>
        ) : (
          circles.map(circle => {
            const s = STATUS_STYLE[circle.status] || STATUS_STYLE.forming;
            return (
              <Link
                key={circle.id}
                to="/circle-detail"
                state={{ circle }}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  background: C.white, borderRadius: 12, padding: '14px',
                  marginBottom: 10, border: `1px solid ${C.border}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>{circle.name}</div>
                    <span style={{ background: s.bg, color: s.color, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>{s.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, color: C.muted, fontSize: 12 }}>
                    <span>GHS {circle.contribution_amount} · {circle.frequency}</span>
                    <span>{circle.max_members} members</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: C.hint }}>Pot balance</div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: C.goldText }}>GHS {(circle.pot_balance || 0).toLocaleString()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: C.hint }}>Cycle</div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: C.ink }}>#{circle.current_cycle || 1}</div>
                    </div>
                    {circle.is_insured && (
                      <span style={{ background: C.tealBg, color: C.tealTx, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>🛡 Insured</span>
                    )}
                  </div>
                </div>
              </Link>
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