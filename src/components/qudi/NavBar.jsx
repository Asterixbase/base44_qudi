import { Link, useLocation } from 'react-router-dom';
import { C } from '../../lib/qudiTokens';
import KenteStripe from './KenteStripe';

const NAV_ITEMS = [
  { label: 'Home',      icon: '⌂',  path: '/dashboard' },
  { label: 'Circles',   icon: '◎',  path: '/circle-detail' },
  { label: 'Reminders', icon: '🔔', path: '/reminders' },
  { label: 'Disputes',  icon: '🚩', path: '/disputes' },
  { label: 'More',      icon: '···',path: '/dashboard' },
];

export default function NavBar() {
  const { pathname } = useLocation();
  return (
    <div style={{ borderTop: `1px solid ${C.border}`, background: C.white }}>
      <div style={{ display: 'flex' }}>
        {NAV_ITEMS.map(({ label, icon, path }) => {
          const active = pathname === path && (path !== '/dashboard' || label === 'Home');
          return (
            <Link key={label} to={path} style={{
              flex: 1, textAlign: 'center', padding: '10px 4px 8px',
              textDecoration: 'none', color: active ? C.goldText : C.muted,
              fontSize: 10, fontWeight: active ? 600 : 400, minHeight: 44,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}