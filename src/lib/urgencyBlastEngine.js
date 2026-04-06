/**
 * Urgency Blast Engine
 * Sends urgent collection reminders to all unpaid members in a circle.
 */
import { base44 } from '@/api/base44Client';

export async function sendUrgencyBlast({ circle, triggedBy }) {
  const cycle = circle.current_cycle || 1;
  const members = await base44.entities.Member.filter({ circle_id: circle.id });
  const transactions = await base44.entities.Transaction.filter({ circle_id: circle.id, cycle, type: 'collection' });

  const paid = new Set(transactions.filter(t => t.status === 'success').map(t => t.member_id));
  const unpaidMembers = members.filter(m => !paid.has(m.id));

  const blastResults = [];
  const timestamp = new Date().toLocaleString('en-GB');
  const blastRef = `URGENT-${Date.now().toString(36).toUpperCase()}`;

  for (const member of unpaidMembers) {
    const message = `🚨 URGENT: ${circle.name} needs your contribution of GHS ${circle.contribution_amount} NOW to stay on track! You have 24 hours. Reply "OK" when paid. Ref: ${blastRef} — Qudi`;

    try {
      await base44.entities.Notification.create({
        circle_id:   circle.id,
        member_id:   member.id,
        member_name: member.full_name,
        phone:       member.phone || 'N/A',
        message,
        status:      'sent',
        channel:     'in-app',
      });
      blastResults.push({ member: member.full_name, status: 'sent' });
    } catch (e) {
      blastResults.push({ member: member.full_name, status: 'failed', error: e.message });
    }
  }

  // Log the blast event for audit
  const auditNote = `Urgency blast triggered by ${triggedBy || 'Admin'} at ${timestamp}. Sent to ${blastResults.filter(r => r.status === 'sent').length} members. Ref: ${blastRef}`;

  return {
    blastRef,
    circleId: circle.id,
    circleName: circle.name,
    sent: blastResults.filter(r => r.status === 'sent').length,
    failed: blastResults.filter(r => r.status === 'failed').length,
    results: blastResults,
    auditNote,
    timestamp,
  };
}