/**
 * Qudi Payout Scheduler
 * Computes payout sequences and manages circle lifecycle.
 */
import { base44 } from '@/api/base44Client';

/** Deterministic shuffle using circle id as seed */
function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build the full payout sequence for a circle given its members.
 * Returns array of members in payout order.
 */
export function buildPayoutSequence(circle, members, bids = []) {
  const eligible = members.filter(m => !m.has_received_payout);

  switch (circle.payout_order) {
    case 'random':
      return seededShuffle(eligible, circle.id || 'seed');

    case 'rotation':
    case 'fixed':
      return [...eligible].sort((a, b) => (a.payout_position || 0) - (b.payout_position || 0));

    case 'bid': {
      // Higher bid = earlier payout. bids is [{member_id, amount}]
      const bidMap = Object.fromEntries(bids.map(b => [b.member_id, b.amount]));
      return [...eligible].sort((a, b) => (bidMap[b.id] || 0) - (bidMap[a.id] || 0));
    }

    default:
      return eligible;
  }
}

/**
 * Execute a payout for the next member in the sequence.
 * 1. Creates a payout Transaction
 * 2. Marks member as has_received_payout
 * 3. Advances circle.current_cycle
 * 4. If all members paid out → sets circle.status = 'completed'
 * 5. Sends 'Payout Initiated' in-app notification to recipient
 */
export async function executeNextPayout({ circle, recipient, allMembers }) {
  const payoutAmount = circle.contribution_amount * allMembers.length;

  // Create transaction record
  const tx = await base44.entities.Transaction.create({
    circle_id:   circle.id,
    member_id:   recipient.id,
    member_name: recipient.full_name,
    type:        'payout',
    amount:      payoutAmount,
    status:      'pending',
    cycle:       circle.current_cycle || 1,
    note:        `Payout initiated — ${circle.payout_order} order`,
  });

  // Mark recipient
  await base44.entities.Member.update(recipient.id, { has_received_payout: true });

  // Advance cycle
  const nextCycle = (circle.current_cycle || 1) + 1;
  const unpaidCount = allMembers.filter(m => !m.has_received_payout && m.id !== recipient.id).length;
  const isComplete = unpaidCount === 0;

  await base44.entities.Circle.update(circle.id, {
    current_cycle: nextCycle,
    ...(isComplete ? { status: 'completed' } : {}),
  });

  // Notify recipient
  const msg = `🎉 Payout Initiated! GHS ${payoutAmount.toLocaleString()} from "${circle.name}" is on its way to your MoMo (${recipient.phone || 'registered number'}). — Qudi`;
  await base44.entities.Notification.create({
    circle_id:   circle.id,
    member_id:   recipient.id,
    member_name: recipient.full_name,
    phone:       recipient.phone || 'N/A',
    message:     msg,
    status:      'sent',
    channel:     'in-app',
  });

  return { tx, isComplete, nextCycle, payoutAmount };
}