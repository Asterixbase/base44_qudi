import { C } from '../../lib/qudiTokens';

export default function TrustBadge({ score, size = 'small' }) {
  const level = score >= 90
    ? { label: 'Trusted',       color: C.green,   bg: C.greenBg }
    : score >= 70
    ? { label: 'Verified',      color: C.teal,    bg: C.tealBg }
    : score >= 40
    ? { label: 'Building trust', color: C.amber,   bg: C.amberBg }
    : { label: 'New member',    color: C.muted,   bg: C.card };

  if (size === 'small') {
    return (
      <span style={{
        background: level.bg, color: level.color, borderRadius: 4,
        padding: '2px 6px', fontSize: 11, fontWeight: 500,
      }}>
        {level.label} {score}%
      </span>
    );
  }

  return (
    <div style={{ background: level.bg, borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ color: level.color, fontWeight: 600, fontSize: 13 }}>Trust score: {score}% — {level.label}</div>
      <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
        Based on payment history &amp; completed circles
      </div>
    </div>
  );
}