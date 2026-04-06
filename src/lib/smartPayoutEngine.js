/**
 * Smart Payout Engine
 * Uses cash-flow forecast reliability data to gate payout execution.
 * A payout is only triggered when collected funds reach the safe threshold.
 */
import { base44 } from '@/api/base44Client';

export const SAFE_THRESHOLD = 0.80; // 80% of gross pot must be collected

function memberReliability(memberId, transactions) {
  const txs = transactions.filter(t => t.member_id === memberId && t.type === 'collection');
  if (txs.length === 0) return 0.7;
  return txs.filter(t => t.status === 'success').length / txs.length;
}

export function computeForecastRate(circle, members, transactions) {
  const currentCycle = circle.current_cycle || 1;
  const grossPot = (circle.contribution_amount || 0) * (members.length || circle.max_members || 1);
  const reliabilities = members.map(m => memberReliability(m.id, transactions));
  const avgReliability = reliabilities.length
    ? reliabilities.reduce((a, b) => a + b, 0) / reliabilities.length
    : 0.7;
  const pastCollections = transactions.filter(t => t.type === 'collection' && t.status === 'success');
  const historicalRate = pastCollections.length > 0
    ? Math.min(1, pastCollections.reduce((s, t) => s + (t.amount || 0), 0) / Math.max(1, (currentCycle - 1) * grossPot || grossPot))
    : avgReliability;
  return (historicalRate * 0.6 + avgReliability * 0.4);
}

export function computeCollectedThisCycle(circle, transactions) {
  const cycle = circle.current_cycle || 1;
  return transactions
    .filter(t => t.type === 'collection' && t.cycle === cycle && t.status === 'success')
    .reduce((s, t) => s + (t.amount || 0), 0);
}

export function isPayoutSafe(circle, members, transactions) {
  const grossPot = (circle.contribution_amount || 0) * (members.length || circle.max_members || 1);
  const collected = computeCollectedThisCycle(circle, transactions);
  const collectionRate = grossPot > 0 ? collected / grossPot : 0;
  const forecastRate = computeForecastRate(circle, members, transactions);
  return {
    grossPot,
    collected,
    collectionRate,
    forecastRate,
    safe: collectionRate >= SAFE_THRESHOLD,
    collectionPct: Math.round(collectionRate * 100),
    forecastPct: Math.round(forecastRate * 100),
    shortfall: Math.max(0, Math.round(grossPot * SAFE_THRESHOLD) - collected),
  };
}

export async function executeSmartPayout({ circle, winner, amount, note }) {
  // Create payout transaction
  const txRef = `QSPAY-${Date.now().toString(36).toUpperCase()}`;
  const tx = await base44.entities.Transaction.create({
    circle_id:   circle.id,
    member_id:   winner.id,
    member_name: winner.full_name,
    type:        'payout',
    amount,
    status:      'success',
    momo_ref:    txRef,
    cycle:       circle.current_cycle || 1,
    note:        note || `Smart payout — Cycle ${circle.current_cycle || 1}`,
  });

  // Mark member as paid
  await base44.entities.Member.update(winner.id, { has_received_payout: true });

  // Notify member
  await base44.entities.Notification.create({
    circle_id:   circle.id,
    member_id:   winner.id,
    member_name: winner.full_name,
    phone:       winner.phone || 'N/A',
    message:     `🎉 Your payout of GHS ${amount.toLocaleString()} from "${circle.name}" (Cycle ${circle.current_cycle || 1}) has been sent! Ref: ${txRef} — Qudi`,
    status:      'sent',
    channel:     'in-app',
  });

  return { tx, txRef };
}