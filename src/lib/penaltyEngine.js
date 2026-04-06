/**
 * Qudi Penalty Engine
 * Computes penalty amounts and fires notifications for late members.
 */
import { base44 } from '@/api/base44Client';

/**
 * Compute the penalty amount for a member based on circle terms.
 */
export function computePenalty(circle, daysLate) {
  const grace = circle.penalty_grace_days ?? 0;
  const effectiveDays = Math.max(0, daysLate - grace);
  if (effectiveDays <= 0) return 0;

  const contribution = circle.contribution_amount || 0;
  switch (circle.penalty_type) {
    case 'flat_fee':
      return circle.penalty_flat_fee || 0;
    case 'percentage':
      return Math.round(contribution * ((circle.penalty_percentage || 5) / 100) * 100) / 100;
    case 'daily_interest':
      return Math.round(contribution * ((circle.penalty_daily_rate || 1) / 100) * effectiveDays * 100) / 100;
    default:
      return 0;
  }
}

function penaltyTypeLabel(type) {
  return { flat_fee: 'Flat fee', percentage: 'Percentage fee', daily_interest: 'Daily interest' }[type] || type;
}

/**
 * Apply a penalty for a late member:
 * 1. Creates a Penalty record
 * 2. Sends in-app notification to the member
 * 3. Optionally sends in-app notification to the guarantor
 * Returns the created penalty record.
 */
export async function applyPenalty({ circle, member, daysLate }) {
  const penaltyAmount = computePenalty(circle, daysLate);
  if (penaltyAmount <= 0) return null;

  // Create penalty record
  const penalty = await base44.entities.Penalty.create({
    circle_id:        circle.id,
    member_id:        member.id,
    member_name:      member.full_name,
    guarantor_name:   member.guarantor_name || null,
    cycle:            circle.current_cycle || 1,
    type:             circle.penalty_type,
    original_amount:  circle.contribution_amount,
    penalty_amount:   penaltyAmount,
    days_late:        daysLate,
    status:           'pending',
    member_notified:  false,
    guarantor_notified: false,
  });

  // Notify member
  const memberMsg = `⚠️ Penalty applied: GHS ${penaltyAmount} (${penaltyTypeLabel(circle.penalty_type)}) has been added to your account for "${circle.name}" — ${daysLate} day(s) late. Please settle to avoid further charges. — Qudi`;
  await base44.entities.Notification.create({
    circle_id:   circle.id,
    member_id:   member.id,
    member_name: member.full_name,
    phone:       member.phone || 'N/A',
    message:     memberMsg,
    status:      'sent',
    channel:     'in-app',
  });
  await base44.entities.Penalty.update(penalty.id, { member_notified: true });

  // Notify guarantor if configured
  if (circle.penalty_notify_guarantor && member.guarantor_name) {
    const guarantorMsg = `🔔 Guarantor notice: ${member.full_name} has incurred a GHS ${penaltyAmount} late penalty in "${circle.name}". As guarantor (${member.guarantor_name}), you may be liable if unpaid. — Qudi`;
    await base44.entities.Notification.create({
      circle_id:   circle.id,
      member_id:   member.id,
      member_name: member.guarantor_name,
      phone:       'N/A',
      message:     guarantorMsg,
      status:      'sent',
      channel:     'in-app',
    });
    await base44.entities.Penalty.update(penalty.id, { guarantor_notified: true });
  }

  return { ...penalty, penalty_amount: penaltyAmount };
}