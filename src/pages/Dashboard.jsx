import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';
import Avatar from '../components/qudi/Avatar';

const DEMO_CIRCLES = [
  { id: 'c1', name: 'Kantamanto Traders', meta: 'Cycle 3 · Monthly · 10 members', amount: 'GHS 1,400', status: 'active', progress: 70, initials: 'KT', isInsured: true },
  { id: 'c2', name: 'Madina Women Circle', meta: 'Forming · Weekly · 3/5 joined', amount: '2 spots left', status: 'forming', progress: 60, initials: 'MW', isInsured: false },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [circles, setCircles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Circle.list('-created_date', 10)
      .then(data => setCircles(data.length ? data : DEMO_CIRCLES))
      .catch(() => setCircles(DEMO_CIRCLES))
      .finally(() => setLoading(false));
  }, []);

  const statusStyle = (s) => s === 'active'
    ? { bg: '#D4EDDA', color: '#155724', label: 'ACTIVE' }
    : s === 'forming'
    ? { bg: '#E3F0FF', color: '#2D6FA8', label: 'FORMING' }
    : { bg: '#EDE6D6', color: '#6B5A3A', label: 'COMPLETED' };

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ background: C.ink, padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: C.gold,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, color: C.ink, fontSize: 16,
            }}>Q</div>
            <span style={{ color: C.cream, fontWeight: 700, fontSize: 16 }}>Qudi</span>
          </div>
          <button onClick={() => navigate('/dashboard')} style={{
            width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: C.cream, fontSize: 18, position: 'relative',
          }}>
            🔔
            <span style={{
              position: 'absolute', top: 6, right: 6, width: 8, height: 8,
              borderRadius: '50%', background: C.red,
            }} />
          </button>
        </div>

        {/* Hero card */}
        <div style={{
          background: 'rgba(255,255,255,0.06)', borderRadius: '14px 14px 0 0',
          padding: '18px 16px 20px', border: `0.5px solid rgba(235,160,32,0.3)`,
        }}>
          <div style={{ color: C.hintOnDark, fontSize: 13 }}>Good morning,</div>
          <div style={{ color: C.cream, fontWeight: 700, fontSize: 20, marginTop: 2 }}>Akosua Asante</div>
          <div style={{ color: C.hintOnDark, fontSize: 12, marginTop: 2, marginBottom: 16 }}>Total across circles</div>
          <div style={{ color: C.gold, fontSize: 32, fontWeight: 800, letterSpacing: -0.5 }}>GHS 3,400</div>
          <div style={{ color: C.hintOnDark, fontSize: 12, marginTop: 4, marginBottom: 16 }}>2 active circles · 15 members</div>
          <div style={{ display: 'flex', gap: 20 }}>
            {[{ v: '3', l: 'Circles' }, { v: '85%', l: 'Paid on time' }].map(m => (
              <div key={m.l}>
                <div style={{ color: C.cream, fontWeight: 700, fontSize: 18 }}>{m.v}</div>
                <div style={{ color: C.hintOnDark, fontSize: 12 }}>{m.l}</div>
              </div>
            ))}
          </div>
        </div>
        <KenteStripe height={4} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 70 }}>
        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 0, padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
          {[
            { label: 'Collect', path: '/collect-dues' },
            { label: 'Pay out', path: '/send-payout' },
            { label: 'Insure', path: '/dashboard' },
            { label: 'History', path: '/dashboard' },
          ].map(({ label, path }) => (
            <Link key={label} to={path} style={{
              flex: 1, textAlign: 'center', padding: '10px 4px', fontSize: 13,
              fontWeight: 600, color: C.goldText, textDecoration: 'none',
              borderRight: `1px solid ${C.border}`,
            }}>{label}</Link>
          ))}
        </div>

        {/* Circles */}
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>Your circles</div>
            <span style={{ color: C.goldText, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>See all</span>
          </div>

          {loading ? (
            [1,2].map(i => (
              <div key={i} style={{ background: C.white, borderRadius: 12, padding: 16, marginBottom: 8, height: 80, animation: 'pulse 1.5s infinite' }} />
            ))
          ) : circles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: C.muted }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>◎</div>
              <div style={{ fontWeight: 600, color: C.ink, marginBottom: 6 }}>No circles yet</div>
              <div style={{ fontSize: 13 }}>Create or join a circle to get started</div>
            </div>
          ) : (
            circles.map((circle) => {
              const s = statusStyle(circle.status);
              return (
                <div key={circle.id} onClick={() => navigate('/circle-detail', { state: { circle } })} style={{
                  background: C.white, borderRadius: 12, padding: '12px 14px',
                  marginBottom: 8, border: `0.5px solid ${C.border}`, cursor: 'pointer',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar initials={circle.initials || (circle.name || '').slice(0,2).toUpperCase()} size={40} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{circle.name}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{circle.meta || `${circle.frequency || 'monthly'} · ${circle.max_members || '?'} members`}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <span style={{ background: s.bg, color: s.color, borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>{s.label}</span>
                        {(circle.is_insured || circle.isInsured) && (
                          <span style={{ background: C.tealBg, color: C.tealTx, borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>Insured</span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.goldText }}>{circle.amount || `GHS ${circle.contribution_amount || '—'}`}</div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 3, background: C.border, borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: C.gold, width: `${circle.progress || 50}%`, borderRadius: 2 }} />
                  </div>
                </div>
              );
            })
          )}

          {/* Create circle CTA */}
          <div onClick={() => navigate('/dashboard')} style={{
            background: C.white, borderRadius: 12, padding: '16px', marginBottom: 8,
            border: `1.5px dashed ${C.gold}`, cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: 12, justifyContent: 'center',
          }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FFF3D6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.goldText, fontWeight: 700, fontSize: 20 }}>+</div>
            <span style={{ fontWeight: 600, color: C.ink, fontSize: 14 }}>Create new circle</span>
          </div>

          {/* Mixed circles (Coming Soon) */}
          <div style={{
            background: C.ink, borderRadius: 12, padding: '14px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: C.cream, fontWeight: 700, fontSize: 13 }}>Mixed circles</div>
              <div style={{ color: C.hintOnDark, fontSize: 12 }}>Ghana + UK diaspora in one circle</div>
              <div style={{ color: C.hintOnDark, fontSize: 11, marginTop: 4 }}>GBP ↔ GHS · Cross-border · FCA regulated</div>
            </div>
            <span style={{ background: C.amberBg, color: C.amberTx, borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 600 }}>Coming soon</span>
          </div>
        </div>

        {/* Alerts */}
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 10 }}>Alerts</div>
          {[
            { text: "Ama Osei's payment failed — guarantor charged ₵200.", bg: C.redBg, border: C.red, color: C.redTx, cta: 'Review', path: '/circle-detail' },
            { text: 'Insurance claim CLM-A3F8 under GLICO review.', bg: C.amberBg, border: C.gold, color: C.amberTx, cta: 'Track', path: '/dashboard' },
          ].map((a, i) => (
            <div key={i} style={{
              background: a.bg, border: `1px solid ${a.border}`,
              borderRadius: 10, padding: '10px 12px', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ flex: 1, color: a.color, fontSize: 13 }}>{a.text}</span>
              <Link to={a.path} style={{
                background: a.border, color: C.white, borderRadius: 6,
                padding: '5px 12px', fontSize: 12, fontWeight: 600, textDecoration: 'none', flexShrink: 0,
              }}>{a.cta}</Link>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430 }}>
        <NavBar />
      </div>
    </div>
  );
}