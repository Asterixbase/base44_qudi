import { C } from '../../lib/qudiTokens';
import Avatar from './Avatar';

const FREQUENCY_DAYS = { weekly: 7, monthly: 30 };

function getPayoutDate(startCycle, position, frequency) {
  const days = FREQUENCY_DAYS[frequency] || 30;
  const cyclesFromNow = position - startCycle;
  if (cyclesFromNow < 0) return null; // already paid
  const date = new Date(Date.now() + cyclesFromNow * days * 86400000);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PayoutSchedule({ members, circle }) {
  const currentCycle = circle?.current_cycle || 3;
  const frequency = circle?.frequency || 'monthly';
  const contribution = circle?.contribution_amount || 200;
  const maxMembers = circle?.max_members || 10;
  const potPerCycle = contribution * maxMembers;

  const sorted = [...members].sort((a, b) => a.payout_position - b.payout_position);
  const nextRecipient = sorted.find(m => m.payout_position === currentCycle);

  return (
    <div style={{ margin: '0 16px 16px', background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>Payout Schedule</div>
        <span style={{ fontSize: 11, color: C.muted }}>GHS {potPerCycle.toLocaleString()} / cycle</span>
      </div>

      {/* Next up banner */}
      {nextRecipient && (
        <div style={{ margin: '0 14px 10px', background: C.ink, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🏆</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.hintOnDark, fontSize: 11, fontWeight: 600 }}>NEXT TO RECEIVE</div>
            <div style={{ color: C.gold, fontWeight: 700, fontSize: 14 }}>{nextRecipient.full_name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: C.gold, fontWeight: 800, fontSize: 15 }}>GHS {potPerCycle.toLocaleString()}</div>
            <div style={{ color: C.hintOnDark, fontSize: 11 }}>Cycle {currentCycle}</div>
          </div>
        </div>
      )}

      {/* Schedule list */}
      <div style={{ padding: '0 14px 14px' }}>
        {sorted.map((m, i) => {
          const isPast = m.payout_position < currentCycle;
          const isCurrent = m.payout_position === currentCycle;
          const payoutDate = getPayoutDate(currentCycle, m.payout_position, frequency);

          let rowBg = 'transparent';
          let posColor = C.muted;
          let badge = null;

          if (isCurrent) {
            rowBg = C.amberBg;
            posColor = C.goldText;
            badge = <span style={{ background: C.gold, color: C.ink, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>UP NEXT</span>;
          } else if (isPast) {
            badge = <span style={{ background: C.greenBg, color: C.green, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>✓ PAID</span>;
          } else {
            badge = <span style={{ fontSize: 12, color: C.muted }}>{payoutDate}</span>;
          }

          return (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 8, marginBottom: 4,
              background: rowBg,
              opacity: isPast ? 0.55 : 1,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: posColor, width: 20, textAlign: 'center' }}>
                #{m.payout_position}
              </div>
              <Avatar initials={m.initials} size={32} bg={isCurrent ? C.gold : C.card} color={isCurrent ? C.ink : C.muted} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: isPast ? C.muted : C.ink }}>{m.full_name}</div>
              </div>
              {badge}
            </div>
          );
        })}
      </div>
    </div>
  );
}