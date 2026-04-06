/**
 * Collection Monitor
 * Real-time monitoring of circle collection rates against the 70% threshold.
 */
import { base44 } from '@/api/base44Client';

const ALERT_THRESHOLD = 0.70; // 70%

export function getCollectionRate(circle, transactions) {
  const cycle = circle.current_cycle || 1;
  const grossPot = (circle.contribution_amount || 0) * (circle.max_members || 1);
  const collected = transactions
    .filter(t => t.type === 'collection' && t.cycle === cycle && t.status === 'success')
    .reduce((s, t) => s + (t.amount || 0), 0);
  return grossPot > 0 ? collected / grossPot : 0;
}

export function isAlertTriggered(circle, transactions) {
  const rate = getCollectionRate(circle, transactions);
  return rate < ALERT_THRESHOLD;
}

export async function checkAllCircles() {
  const circles = await base44.entities.Circle.filter({ status: 'active' }, '-created_date', 50);
  const alerts = [];

  await Promise.all(circles.map(async (circle) => {
    const transactions = await base44.entities.Transaction.filter({ circle_id: circle.id, type: 'collection' }, '-created_date', 200);
    const rate = getCollectionRate(circle, transactions);
    if (rate < ALERT_THRESHOLD) {
      alerts.push({
        circle,
        rate: Math.round(rate * 100),
        grossPot: (circle.contribution_amount || 0) * (circle.max_members || 1),
        collected: transactions
          .filter(t => t.type === 'collection' && t.cycle === (circle.current_cycle || 1) && t.status === 'success')
          .reduce((s, t) => s + (t.amount || 0), 0),
      });
    }
  }));

  return alerts;
}

export async function notifyAdminOfAlert({ circle, rate, organiser }) {
  const message = `⚠ ${circle.name}: Collection is only ${rate}% (below 70% threshold). Consider sending an urgency blast to members. — Qudi`;
  await base44.entities.Notification.create({
    circle_id:   circle.id,
    member_id:   organiser?.id || 'admin',
    member_name: organiser?.full_name || 'Admin',
    phone:       organiser?.phone || 'N/A',
    message,
    status:      'sent',
    channel:     'in-app',
  });
  return message;
}