/**
 * Qudi Reminder Scheduler
 * Computes the next contribution date for a circle and determines
 * which reminder tier (3d / 1d / 0d) each member is due for.
 */

const FREQUENCY_DAYS = { weekly: 7, monthly: 30 };

/**
 * Given a circle and an explicit cycle start date, return the next contribution deadline.
 */
export function getNextContributionDateFromStart(circle, startDate) {
  const freqDays = FREQUENCY_DAYS[circle.frequency] || 30;
  const base = startDate ? new Date(startDate) : (circle.created_date ? new Date(circle.created_date) : new Date());
  const cycle = circle.current_cycle || 1;
  return new Date(base.getTime() + cycle * freqDays * 86400000);
}

/**
 * Given a circle, return the ISO date string of the next contribution deadline.
 * We use the circle's created_date + (current_cycle * frequency_days) as an approximation.
 */
export function getNextContributionDate(circle) {
  const freqDays = FREQUENCY_DAYS[circle.frequency] || 30;
  const base = circle.created_date ? new Date(circle.created_date) : new Date();
  const cycle = circle.current_cycle || 1;
  const nextDate = new Date(base.getTime() + cycle * freqDays * 86400000);
  return nextDate;
}

/**
 * Returns how many days until the deadline (can be negative if past).
 */
export function daysUntil(date) {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.round(diff / 86400000);
}

/**
 * Determine the reminder tier for a member given days remaining.
 * Returns null if no reminder is due.
 */
export function getReminderTier(daysLeft) {
  if (daysLeft === 3) return { tier: '3-day',  emoji: '📅', urgency: 'upcoming' };
  if (daysLeft === 2) return { tier: '2-day',  emoji: '⏳', urgency: 'approaching' };
  if (daysLeft === 1) return { tier: '1-day',  emoji: '⏰', urgency: 'soon' };
  if (daysLeft === 0) return { tier: 'due-today', emoji: '🔔', urgency: 'critical' };
  return null;
}

/**
 * Build the reminder message for a member.
 */
export function buildReminderMessage(member, circle, tier) {
  const amount = circle.contribution_amount || 200;
  const name = circle.name || 'your circle';
  const msgs = {
    '3-day':     `Hi ${member.full_name}, your GHS ${amount} contribution to "${name}" is due in 3 days. Pay via MoMo to stay on track! — Qudi`,
    '2-day':     `⏳ Heads up, ${member.full_name}! Your GHS ${amount} contribution to "${name}" is due in 2 days. Don't forget to pay via MoMo. — Qudi`,
    '1-day':     `⚠️ Reminder: Your GHS ${amount} contribution to "${name}" is due TOMORROW. Please pay via MoMo before the deadline. — Qudi`,
    'due-today': `🔔 TODAY is payment day! Your GHS ${amount} contribution to "${name}" must be paid now via MoMo to avoid penalties. — Qudi`,
  };
  return msgs[tier] || '';
}

/**
 * Run automated reminder blast: fetch all active circles, find members within
 * 3 days of their deadline (based on cycleStartDate), send in-app notifications.
 * Returns { sent: [], skipped: [] }
 */
export async function runAutoReminders(base44Client, cycleStartDate) {
  const circles = await base44Client.entities.Circle.filter({ status: 'active' });
  const sent = [];
  const skipped = [];

  for (const circle of circles) {
    const members = await base44Client.entities.Member.filter({ circle_id: circle.id });
    const deadline = getNextContributionDateFromStart(circle, cycleStartDate || circle.created_date);
    const daysLeft = daysUntil(deadline);
    const tier = getReminderTier(daysLeft);

    // Only fire for 0–3 day window
    if (!tier) {
      skipped.push({ circle: circle.name, reason: `${daysLeft} days away — outside reminder window` });
      continue;
    }

    for (const member of members) {
      if (member.payment_status === 'paid') {
        skipped.push({ name: member.full_name, circle: circle.name, reason: 'Already paid' });
        continue;
      }

      const message = buildReminderMessage(member, circle, tier.tier);
      await base44Client.entities.Notification.create({
        circle_id:   circle.id,
        member_id:   member.id,
        member_name: member.full_name,
        phone:       member.phone || 'N/A',
        message,
        status:  'sent',
        channel: 'in-app',
      });

      sent.push({
        name:    member.full_name,
        circle:  circle.name,
        daysLeft,
        tier:    tier.tier,
        message,
      });
    }
  }

  return { sent, skipped };
}

/**
 * Given a list of circles and their members, return all pending reminders to fire.
 * Filters out members who have already paid.
 */
export function computePendingReminders(circles, membersByCircle) {
  const reminders = [];
  for (const circle of circles) {
    const members = membersByCircle[circle.id] || [];
    const deadline = getNextContributionDate(circle);
    const daysLeft = daysUntil(deadline);
    const tier = getReminderTier(daysLeft);
    if (!tier) continue;

    for (const m of members) {
      if (m.payment_status === 'paid') continue; // already paid, skip
      reminders.push({ circle, member: m, deadline, daysLeft, ...tier });
    }
  }
  return reminders;
}