/**
 * Qudi Automated Penalty Engine
 * - Calculates fines based on circle rules
 * - Creates Penalty + PenaltyLedger records
 * - Auto-deducts from future payout or logs as outstanding debt
 */
import { base44 } from '@/api/base44Client';

// ── deadline helpers ────────────────────────────────────────────────────────

/**
 * Returns the contribution due date for the current cycle.
 * @param {object} circle  - Circle record (frequency, current_cycle)
 * @param {string} startDate - ISO date string of cycle 1 start
 */
export function calcDueDate(circle, startDate) {
  const base = startDate ? new Date(startDate) : new Date();
  const freqDays = circle.frequency === 'weekly' ? 7 : 30;
  const cycle = (circle.current_cycle || 1) - 1; // 0-indexed offset
  const due = new Date(base);
  due.setDate(due.getDate() + freqDays * cycle);
  return due;
}

/**
 * Returns how many days past due TODAY is (0 if not yet due).
 * @param {object} circle
 * @param {string} startDate - ISO date string
 */
export function calcDaysLate(circle, startDate) {
  const due = calcDueDate(circle, startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.floor((today - due) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

// ── calculation ────────────────────────────────────────────────────────────

export function calcPenaltyAmount(circle, contributionAmount, daysLate) {
  if (!circle.penalty_enabled) return 0;
  if (daysLate <= (circle.penalty_grace_days || 0)) return 0;

  switch (circle.penalty_type) {
    case 'flat_fee':
      return circle.penalty_flat_fee || 0;
    case 'percentage':
      return Math.round(contributionAmount * ((circle.penalty_percentage || 0) / 100) * 100) / 100;
    case 'daily_interest': {
      const effectiveDays = daysLate - (circle.penalty_grace_days || 0);
      return Math.round(contributionAmount * ((circle.penalty_daily_rate || 0) / 100) * effectiveDays * 100) / 100;
    }
    default:
      return 0;
  }
}

// ── auto-trigger for a single overdue member ───────────────────────────────

export async function triggerPenalty({ circle, member, daysLate }) {
  const penaltyAmount = calcPenaltyAmount(circle, circle.contribution_amount || 0, daysLate);
  if (penaltyAmount <= 0) return null;

  // Create canonical Penalty record
  const penalty = await base44.entities.Penalty.create({
    circle_id:       circle.id,
    member_id:       member.id,
    member_name:     member.full_name,
    guarantor_name:  member.guarantor_name || '',
    cycle:           circle.current_cycle || 1,
    type:            circle.penalty_type || 'flat_fee',
    original_amount: circle.contribution_amount || 0,
    penalty_amount:  penaltyAmount,
    days_late:       daysLate,
    status:          'pending',
    member_notified: true,
    guarantor_notified: !!(circle.penalty_notify_guarantor && member.guarantor_name),
  });

  // Create ledger entry for debt tracking
  const ledger = await base44.entities.PenaltyLedger.create({
    circle_id:           circle.id,
    circle_name:         circle.name,
    member_id:           member.id,
    member_name:         member.full_name,
    cycle:               circle.current_cycle || 1,
    penalty_type:        circle.penalty_type || 'flat_fee',
    contribution_amount: circle.contribution_amount || 0,
    penalty_amount:      penaltyAmount,
    days_late:           daysLate,
    settlement_method:   'payout_deduction',
    settlement_status:   'outstanding',
    auto_triggered:      true,
    note:                `Auto-triggered: ${daysLate} days late on cycle ${circle.current_cycle || 1}`,
  });

  // Notify member
  await base44.entities.Notification.create({
    circle_id:   circle.id,
    member_id:   member.id,
    member_name: member.full_name,
    phone:       member.phone || 'N/A',
    message:     `⚠️ A GHS ${penaltyAmount} penalty has been applied to your account for being ${daysLate} days late on "${circle.name}" (Cycle ${circle.current_cycle || 1}). This will be deducted from your next payout. — Qudi`,
    status:      'sent',
    channel:     'in-app',
  });

  // Notify guarantor if configured
  if (circle.penalty_notify_guarantor && member.guarantor_name) {
    await base44.entities.Notification.create({
      circle_id:   circle.id,
      member_id:   member.id,
      member_name: member.guarantor_name,
      phone:       'N/A',
      message:     `⚠️ Your guaranteee ${member.full_name} has been penalised GHS ${penaltyAmount} in "${circle.name}" for late payment. — Qudi`,
      status:      'sent',
      channel:     'in-app',
    });
  }

  return { penalty, ledger, penaltyAmount };
}

// ── scan for flagged members without applying penalties ──────────────────

/**
 * Returns all overdue/failed members across active circles with penalty info.
 * Does NOT create any records — read-only preview.
 */
export async function scanFlaggedMembers(cycleStartDate) {
  const circles = await base44.entities.Circle.filter({ status: 'active' });
  const flagged = [];

  for (const circle of circles) {
    const members = await base44.entities.Member.filter({ circle_id: circle.id });
    const overdue = members.filter(m => m.payment_status === 'overdue' || m.payment_status === 'failed');

    for (const member of overdue) {
      const daysLate = calcDaysLate(circle, cycleStartDate);
      const penaltyAmount = circle.penalty_enabled
        ? calcPenaltyAmount(circle, circle.contribution_amount || 0, daysLate)
        : 0;

      // Check if already penalised this cycle
      const existing = await base44.entities.PenaltyLedger.filter({
        circle_id: circle.id,
        member_id: member.id,
        cycle: circle.current_cycle || 1,
        settlement_status: 'outstanding',
      });

      flagged.push({
        member,
        circle,
        daysLate,
        penaltyAmount,
        alreadyPenalised: existing.length > 0,
        penaltyEnabled: !!circle.penalty_enabled,
        withinGrace: daysLate <= (circle.penalty_grace_days || 0),
      });
    }
  }

  return flagged;
}

// ── scan all active circles for overdue members ────────────────────────────

export async function runPenaltyScan() {
  const circles = await base44.entities.Circle.filter({ status: 'active' });
  const results = [];

  for (const circle of circles) {
    if (!circle.penalty_enabled) continue;

    const members = await base44.entities.Member.filter({ circle_id: circle.id });
    const overdue = members.filter(m =>
      m.payment_status === 'overdue' || m.payment_status === 'failed'
    );

    for (const member of overdue) {
      // Check if penalty already exists for this member+cycle
      const existing = await base44.entities.PenaltyLedger.filter({
        circle_id: circle.id,
        member_id: member.id,
        cycle: circle.current_cycle || 1,
        settlement_status: 'outstanding',
      });
      if (existing.length > 0) continue; // already penalised this cycle

      const daysLate = member.joined_cycles_ago || 3; // fallback estimate
      const result = await triggerPenalty({ circle, member, daysLate });
      if (result) results.push({ member: member.full_name, circle: circle.name, ...result });
    }
  }

  return results;
}

// ── settle penalty via payout deduction ───────────────────────────────────

export async function settlePenaltyViaDeduction({ ledgerEntry, payoutAmount }) {
  const netPayout = Math.max(0, payoutAmount - ledgerEntry.penalty_amount);

  await base44.entities.PenaltyLedger.update(ledgerEntry.id, {
    settlement_status:    'settled',
    settlement_method:    'payout_deduction',
    deducted_from_cycle:  ledgerEntry.cycle,
    note:                 `Deducted from payout. Original: GHS ${payoutAmount}, Net received: GHS ${netPayout}`,
  });

  // Mark linked Penalty as paid
  const penalties = await base44.entities.Penalty.filter({
    circle_id: ledgerEntry.circle_id,
    member_id: ledgerEntry.member_id,
    cycle:     ledgerEntry.cycle,
    status:    'pending',
  });
  for (const p of penalties) {
    await base44.entities.Penalty.update(p.id, { status: 'paid' });
  }

  await base44.entities.Notification.create({
    circle_id:   ledgerEntry.circle_id,
    member_id:   ledgerEntry.member_id,
    member_name: ledgerEntry.member_name,
    phone:       'N/A',
    message:     `✅ Your GHS ${ledgerEntry.penalty_amount} penalty has been settled via payout deduction. Net payout: GHS ${netPayout}. — Qudi`,
    status:      'sent',
    channel:     'in-app',
  });

  return netPayout;
}

// ── get total outstanding debt for a member ────────────────────────────────

export async function getMemberDebt(memberId, circleId) {
  const entries = await base44.entities.PenaltyLedger.filter({
    member_id:         memberId,
    circle_id:         circleId,
    settlement_status: 'outstanding',
  });
  return entries.reduce((sum, e) => sum + (e.penalty_amount || 0), 0);
}