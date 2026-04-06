/**
 * Qudi MoMo Reconciliation Engine
 * Matches successful MoMo transaction logs against members and auto-marks 'paid'.
 */
import { base44 } from '@/api/base44Client';

/**
 * Run reconciliation for all active circles.
 * Returns a summary of matches found and statuses updated.
 */
export async function runReconciliation() {
  const results = [];

  // Fetch all active circles
  const circles = await base44.entities.Circle.filter({ status: 'active' });

  for (const circle of circles) {
    // Get successful collection transactions for this circle in the current cycle
    const transactions = await base44.entities.Transaction.filter({
      circle_id: circle.id,
      type: 'collection',
      status: 'success',
      cycle: circle.current_cycle || 1,
    });

    if (!transactions.length) continue;

    // Get members who are not yet marked paid
    const members = await base44.entities.Member.filter({ circle_id: circle.id });
    const unpaidMembers = members.filter(m => m.payment_status !== 'paid');

    for (const member of unpaidMembers) {
      // Match by member_id or member_name on the transaction log
      const match = transactions.find(t =>
        t.member_id === member.id ||
        (t.member_name && member.full_name &&
          t.member_name.trim().toLowerCase() === member.full_name.trim().toLowerCase())
      );

      if (match) {
        // Auto-mark as paid
        await base44.entities.Member.update(member.id, { payment_status: 'paid' });

        // Log a notification
        await base44.entities.Notification.create({
          circle_id: circle.id,
          member_id: member.id,
          member_name: member.full_name,
          phone: member.phone || 'N/A',
          message: `✅ Auto-reconciled: Your GHS ${match.amount} MoMo payment (Ref: ${match.momo_ref || 'N/A'}) for "${circle.name}" Cycle ${circle.current_cycle} has been matched and marked as PAID. — Qudi`,
          status: 'sent',
          channel: 'in-app',
        });

        results.push({
          circle_name: circle.name,
          member_name: member.full_name,
          amount: match.amount,
          momo_ref: match.momo_ref || 'N/A',
          status: 'matched',
        });
      } else {
        results.push({
          circle_name: circle.name,
          member_name: member.full_name,
          amount: null,
          momo_ref: null,
          status: 'unmatched',
        });
      }
    }
  }

  return results;
}