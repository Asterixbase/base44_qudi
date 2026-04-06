import { useNavigate } from 'react-router-dom';
import { C } from '../lib/qudiTokens';
import KenteStripe from '../components/qudi/KenteStripe';

export default function Splash() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100dvh', background: C.ink, color: C.cream,
      display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto',
    }}>
      <KenteStripe height={5} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px 32px' }}>
        {/* Logo */}
        <div style={{
          width: 80, height: 80, borderRadius: 20, background: C.gold,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, fontWeight: 900, color: C.ink, marginBottom: 24,
          boxShadow: '0 4px 24px rgba(235,160,32,0.35)',
        }}>Q</div>

        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.5, marginBottom: 6 }}>Qudi</div>
        <div style={{ fontSize: 16, color: C.hintOnDark, marginBottom: 8 }}>Your digital susu circle</div>
        <div style={{ fontSize: 13, color: C.hintOnDark, marginBottom: 40 }}>Powered by MTN MoMo</div>

        {/* Feature chips */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginBottom: 48 }}>
          {['No cash handling', 'USSD payments', 'Instant payouts'].map(f => (
            <div key={f} style={{
              background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
              border: `0.5px solid rgba(235,160,32,0.3)`,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: C.gold, flexShrink: 0,
              }} />
              <span style={{ fontSize: 14, color: C.cream }}>{f}</span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => navigate('/register')} style={{
            background: C.gold, color: C.ink, border: 'none', borderRadius: 12,
            padding: '16px', fontSize: 16, fontWeight: 700, cursor: 'pointer', width: '100%',
          }}>Get started</button>
          <button onClick={() => navigate('/dashboard')} style={{
            background: 'rgba(255,255,255,0.08)', color: C.cream,
            border: `1px solid rgba(255,255,255,0.2)`, borderRadius: 12,
            padding: '16px', fontSize: 16, fontWeight: 600, cursor: 'pointer', width: '100%',
          }}>Sign in</button>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '16px 24px 24px', color: C.hintOnDark, fontSize: 12 }}>
        Trusted by 14,000+ susu groups across Ghana
      </div>
      <KenteStripe height={5} />
    </div>
  );
}