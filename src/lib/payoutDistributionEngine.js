/**
 * Payout Distribution Engine
 * Schedules and executes payouts based on circle maturity,
 * creates transaction records, and generates PDF statements.
 */
import { base44 } from '@/api/base44Client';
import jsPDF from 'jspdf';

/**
 * Calculate maturity date for a cycle position.
 * @param {object} circle - Circle record
 * @param {number} position - 1-based payout position
 * @param {string} startDate - ISO start date
 */
export function calcMaturityDate(circle, position, startDate) {
  const start = startDate ? new Date(startDate) : new Date();
  const freq = circle.frequency === 'weekly' ? 7 : 30;
  const d = new Date(start);
  d.setDate(d.getDate() + freq * (position - 1));
  return d;
}

/**
 * Check if a member's payout is due today or overdue.
 */
export function isPayoutDue(circle, member, startDate) {
  const maturity = calcMaturityDate(circle, member.payout_position || 1, startDate);
  return maturity <= new Date();
}

/**
 * Execute a single payout for a member.
 * Creates a Transaction record and notification.
 * Returns { transaction, notification } or throws.
 */
export async function executePayout({ circle, member, amount, note = '' }) {
  const txRef = 'QD-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();

  const transaction = await base44.entities.Transaction.create({
    circle_id:   circle.id,
    member_id:   member.id || member.user_id || '',
    member_name: member.full_name,
    type:        'payout',
    amount:      amount,
    status:      'success',
    momo_ref:    txRef,
    cycle:       circle.current_cycle || 1,
    note:        note || `Auto-payout cycle ${circle.current_cycle || 1}`,
  });

  const notification = await base44.entities.Notification.create({
    circle_id:   circle.id,
    member_id:   member.id || '',
    member_name: member.full_name,
    message:     `💸 GHS ${amount.toLocaleString()} payout sent to ${member.full_name} (${member.phone || 'MoMo'}). Ref: ${txRef}`,
    status:      'sent',
    channel:     'in-app',
  });

  // Mark member as received
  if (member.id) {
    await base44.entities.Member.update(member.id, { has_received_payout: true, payment_status: 'paid' });
  }

  return { transaction, notification, txRef };
}

/**
 * Calculate payout breakdown for the current cycle winner.
 * Returns { winner, grossPot, totalCollected, collectionRate, penaltyDeduction, netPayout, contributions }
 */
export async function calculateCyclePayout({ circle, members, penaltyLedger = [] }) {
  const currentCycle = circle.current_cycle || 1;

  // Fetch all successful collection transactions for this cycle
  const contributions = await base44.entities.Transaction.filter({
    circle_id: circle.id,
    type: 'collection',
    status: 'success',
    cycle: currentCycle,
  });

  const totalCollected = contributions.reduce((s, t) => s + (t.amount || 0), 0);
  const grossPot = (circle.contribution_amount || 0) * (circle.max_members || 1);
  const collectionRate = grossPot > 0 ? Math.round((totalCollected / grossPot) * 100) : 0;

  // Determine current cycle winner by payout position
  const sorted = [...members].sort((a, b) => (a.payout_position || 0) - (b.payout_position || 0));
  const winner = sorted.find(m => !m.has_received_payout) || null;

  // Outstanding penalties for winner
  let penaltyDeduction = 0;
  if (winner) {
    const outstanding = penaltyLedger.filter(
      p => p.member_id === (winner.id || winner.user_id) && p.settlement_status === 'outstanding'
    );
    penaltyDeduction = outstanding.reduce((s, p) => s + (p.penalty_amount || 0), 0);
  }

  const netPayout = Math.max(0, totalCollected - penaltyDeduction);

  return { winner, grossPot, totalCollected, collectionRate, penaltyDeduction, netPayout, contributions };
}

/**
 * Run the full distribution for all due members in a circle.
 * Returns array of results.
 */
export async function runDistribution({ circle, members, startDate, deductPenalties = true, penaltyLedger = [] }) {
  const results = [];
  const baseAmount = (circle.contribution_amount || 0) * (circle.max_members || 1);

  for (const member of members) {
    if (member.has_received_payout) continue;
    if (!isPayoutDue(circle, member, startDate)) continue;

    // Deduct outstanding penalties
    let deduction = 0;
    if (deductPenalties) {
      const outstanding = penaltyLedger.filter(
        p => p.member_id === (member.id || member.user_id) && p.settlement_status === 'outstanding'
      );
      deduction = outstanding.reduce((s, p) => s + (p.penalty_amount || 0), 0);
    }

    const finalAmount = Math.max(0, baseAmount - deduction);

    const result = await executePayout({
      circle,
      member,
      amount: finalAmount,
      note: deduction > 0 ? `Payout less GHS ${deduction} penalty deduction` : '',
    });

    results.push({ member, amount: finalAmount, deduction, ...result });
  }

  return results;
}

/**
 * Generate a PDF payout statement for a single member.
 * Returns blob URL for download.
 */
export function generatePayoutStatement({ circle, member, transaction, deduction = 0 }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a5' });
  const W = doc.internal.pageSize.getWidth();
  let y = 40;

  const line = (text, size = 11, style = 'normal', color = [26, 18, 8]) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    doc.setTextColor(...color);
    doc.text(text, 40, y);
    y += size + 6;
  };

  const rule = (col = [224, 219, 196]) => {
    doc.setDrawColor(...col);
    doc.line(40, y, W - 40, y);
    y += 12;
  };

  // Header
  doc.setFillColor(26, 18, 8);
  doc.rect(0, 0, W, 60, 'F');
  doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(235, 160, 32);
  doc.text('QUDI', 40, 36);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(196, 176, 128);
  doc.text('Payout Statement', 40, 50);

  y = 80;
  line('CIRCLE', 9, 'bold', [107, 90, 58]);
  line(circle.name || '—', 13, 'bold');
  y += 4;
  rule();

  line('RECIPIENT', 9, 'bold', [107, 90, 58]);
  line(member.full_name || '—', 13, 'bold');
  if (member.phone) line(`MoMo: ${member.phone}`, 10);
  y += 4;
  rule();

  line('PAYOUT DETAILS', 9, 'bold', [107, 90, 58]);
  y += 2;

  const rows = [
    ['Gross Payout',     `GHS ${((circle.contribution_amount || 0) * (circle.max_members || 1)).toLocaleString()}`],
    ['Penalty Deducted', deduction > 0 ? `- GHS ${deduction.toLocaleString()}` : 'None'],
    ['Net Amount Sent',  `GHS ${transaction.amount?.toLocaleString() || '—'}`],
    ['MoMo Reference',  transaction.momo_ref || '—'],
    ['Cycle',           `${transaction.cycle || 1}`],
    ['Date',            new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
  ];

  rows.forEach(([label, value]) => {
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 90, 58);
    doc.text(label, 40, y);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 18, 8);
    doc.text(value, W - 40, y, { align: 'right' });
    y += 18;
  });

  y += 8;
  rule([192, 57, 43]);

  // Net highlight
  doc.setFillColor(255, 248, 225);
  doc.roundedRect(40, y, W - 80, 36, 6, 6, 'F');
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 18, 8);
  doc.text('Net Payout', 52, y + 22);
  doc.setFontSize(14); doc.setTextColor(184, 134, 11);
  doc.text(`GHS ${transaction.amount?.toLocaleString() || '—'}`, W - 52, y + 22, { align: 'right' });
  y += 50;

  line('This statement is auto-generated by Qudi. Funds are disbursed via Mobile Money.', 8, 'italic', [138, 122, 80]);
  line('For disputes, contact your circle organiser.', 8, 'italic', [138, 122, 80]);

  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}