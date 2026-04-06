import { C } from '../../lib/qudiTokens';

export default function KenteStripe({ height = 4 }) {
  const stripes = [C.gold, C.ink, C.forest, C.crimson, C.gold, C.ink, C.forest, C.crimson];
  return (
    <div style={{ display: 'flex', height, width: '100%', flexShrink: 0 }}>
      {stripes.map((c, i) => (
        <div key={i} style={{ flex: 1, background: c }} />
      ))}
    </div>
  );
}