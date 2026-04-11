import { Link, useLocation } from 'react-router-dom';
import { C } from '../../lib/qudiTokens';
import KenteStripe from './KenteStripe';

const NAV_ITEMS = [
  { label: 'Home',      icon: '⌂',  path: '/home' },
  { label: 'Circles',   icon: '◎',  path: '/circle-detail' },
  { label: 'Reminders', icon: '🔔', path: '/reminders' },
  { label: 'Alerts',    icon: '🚨', path: '/collection-monitor' },
  { label: 'More',      icon: '···',path: '/settings' },
];

export default function NavBar() {
  const { pathname } = useLocation();
  const isActive = (path) => pathname === path || pathname.startsWith(path + '/');
  return (
    <div style={{ borderTop: `1px solid ${C.border}`, background: C.white, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div style={{ display: 'flex' }}>
        {NAV_ITEMS.map(({ label, icon, path }) => {
          const active = isActive(path);
          return (
            <Link key={label} to={path} style={{
              flex: 1, textAlign: 'center', padding: '10px 4px 8px',
              textDecoration: 'none', color: active ? C.goldText : C.muted,
              fontSize: 10, fontWeight: active ? 600 : 400, minHeight: 44,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              userSelect: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent',
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