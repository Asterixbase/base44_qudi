import { useNavigate } from 'react-router-dom';
import { C } from '../../lib/qudiTokens';

export default function Header({ title, subtitle, onBack, dark = false, right }) {
  const navigate = useNavigate();
  const bg = dark ? C.ink : 'transparent';
  const fg = dark ? C.cream : C.ink;
  const sub = dark ? C.hintOnDark : C.muted;

  return (
    <div style={{ background: bg, padding: '14px 16px 12px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56 }}>
      {(onBack !== false) && (
        <button onClick={onBack || (() => navigate(-1))} style={{
          background: 'none', border: 'none', color: fg, fontSize: 22,
          cursor: 'pointer', padding: 0, minWidth: 32, minHeight: 44,
          display: 'flex', alignItems: 'center',
        }}>←</button>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ color: fg, fontWeight: 700, fontSize: 17 }}>{title}</div>
        {subtitle && <div style={{ color: sub, fontSize: 12, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}