import { C } from '../../lib/qudiTokens';

const ALERTS = {
  simSwap: {
    title: 'SIM change detected',
    desc: "The recipient's MoMo number was recently ported. Payout frozen for 48 hours pending review.",
    severity: 'critical',
  },
  multiCircle: {
    title: 'Multi-circle risk flagged',
    desc: 'This member is active in 4+ circles with early payout positions. Requires organiser approval.',
    severity: 'high',
  },
  newMember: {
    title: 'New member — payout locked',
    desc: 'This member joined less than 2 cycles ago. Must complete 2 contribution cycles first.',
    severity: 'medium',
  },
  walletMismatch: {
    title: 'Wallet name mismatch',
    desc: 'MoMo account name does not match registered name. Payout requires manual verification.',
    severity: 'high',
  },
};

export default function FraudAlert({ type = 'newMember', onDismiss }) {
  const a = ALERTS[type] || ALERTS.newMember;
  const colors = a.severity === 'critical'
    ? { bg: C.redBg,   border: C.red,  fg: C.redTx,   icon: '!' }
    : a.severity === 'high'
    ? { bg: C.amberBg, border: C.gold, fg: C.amberTx, icon: '!' }
    : { bg: C.tealBg,  border: C.teal, fg: C.tealTx,  icon: 'i' };

  return (
    <div style={{
      background: colors.bg, border: `1px solid ${colors.border}`,
      borderRadius: 10, padding: '12px 14px', margin: '0 16px 8px',
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%', background: colors.border,
          color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 12, flexShrink: 0,
        }}>{colors.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: colors.fg, fontWeight: 600, fontSize: 13 }}>{a.title}</div>
          <div style={{ color: colors.fg, fontSize: 12, marginTop: 4, lineHeight: '17px' }}>{a.desc}</div>
        </div>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} style={{
          marginTop: 10, background: colors.border, color: C.white,
          border: 'none', borderRadius: 6, padding: '6px 14px',
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
        }}>Dismiss</button>
      )}
    </div>
  );
}