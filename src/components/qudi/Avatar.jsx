import { C } from '../../lib/qudiTokens';

export default function Avatar({ initials, size = 36, bg = C.gold, color = C.ink }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontWeight: 700,
      fontSize: size * 0.38, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}