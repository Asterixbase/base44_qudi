/**
 * Fraud Detection Engine — Ghana Retail + Diaspora Credit
 * Multi-account abuse, suspicious credit patterns, velocity checks
 */

export const FRAUD_RULES = {
  CREDIT_VELOCITY: { maxPerDay: 5, maxPerHour: 2, window: 3600000 }, // 5 credits/day, 2/hour
  CREDIT_AMOUNT: { maxSingle: 5000, maxDaily: 50000, minDaysHistory: 30 }, // GHS limits
  MOMO_ABUSE: { maxWithdrawalsPerDay: 10, suspiciousPattern: true },
  DUPLICATE_PHONE: { maxAccountsPerPhone: 3 }, // Ghana fintech limitation
  LOCATION_JUMP: { maxKmPerHour: 500 }, // Impossible travel
};

export async function checkCreditFraud(transaction, userHistory) {
  const { amount, customer_phone, dueDate } = transaction;
  const now = Date.now();
  const alerts = [];

  // Rule 1: Credit velocity (same customer)
  const creditsToday = userHistory.filter(t => t.created_date > now - 86400000 && t.type === 'credit').length;
  if (creditsToday >= FRAUD_RULES.CREDIT_VELOCITY.maxPerDay) {
    alerts.push({ code: 'CREDIT_VELOCITY_HIGH', severity: 'high', message: `${creditsToday} credits already issued today` });
  }

  // Rule 2: Credit amount anomaly
  const avgCreditAmount = userHistory.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0) / (userHistory.length || 1);
  if (amount > avgCreditAmount * 3) {
    alerts.push({ code: 'UNUSUAL_AMOUNT', severity: 'medium', message: `Amount ${amount} is 3x average (${avgCreditAmount.toFixed(2)})` });
  }

  // Rule 3: Multi-account abuse (same phone, different shops)
  // Flag if same phone is used by multiple merchant accounts — handled at backend
  if (customer_phone) {
    alerts.push({ code: 'MULTI_ACCOUNT_CHECK', severity: 'info', message: 'Verify phone not linked to >3 shops', requiresApproval: true });
  }

  // Rule 4: Due date sanity
  const dueDateMs = new Date(dueDate).getTime();
  if (dueDateMs < now || dueDateMs > now + 365 * 86400000) {
    alerts.push({ code: 'INVALID_DUE_DATE', severity: 'high', message: 'Due date out of range' });
  }

  return { safe: alerts.length === 0, alerts, riskScore: calculateRiskScore(alerts) };
}

export async function checkMoMoWithdrawalFraud(payout, userHistory) {
  const { amount, momo_phone, momo_network } = payout;
  const now = Date.now();
  const alerts = [];

  // Rule 1: Withdrawal velocity
  const withdrawalsToday = userHistory.filter(t => t.created_date > now - 86400000 && t.type === 'payout').length;
  if (withdrawalsToday >= FRAUD_RULES.MOMO_ABUSE.maxWithdrawalsPerDay) {
    alerts.push({ code: 'PAYOUT_VELOCITY', severity: 'high', message: `${withdrawalsToday} payouts today` });
  }

  // Rule 2: Sudden large payout
  const avgPayout = userHistory.filter(t => t.type === 'payout').reduce((sum, t) => sum + t.amount, 0) / (userHistory.length || 1);
  if (amount > avgPayout * 5) {
    alerts.push({ code: 'UNUSUAL_PAYOUT', severity: 'medium', message: `Payout ${amount} is 5x average` });
  }

  // Rule 3: Network switching (rapid MTN→Telecel flips)
  const last5Payouts = userHistory.filter(t => t.type === 'payout').slice(-5);
  const networkChanges = last5Payouts.reduce((c, t, i) => c + (i > 0 && t.momo_network !== last5Payouts[i-1].momo_network ? 1 : 0), 0);
  if (networkChanges >= 3) {
    alerts.push({ code: 'NETWORK_SWITCHING', severity: 'medium', message: 'Rapid network changes detected' });
  }

  return { safe: alerts.length === 0, alerts, riskScore: calculateRiskScore(alerts) };
}

export function calculateRiskScore(alerts) {
  const weightMap = { high: 40, medium: 20, low: 5, info: 0 };
  return alerts.reduce((score, a) => score + (weightMap[a.severity] || 0), 0);
}

export function shouldRequireApproval(riskScore, userRole = 'cashier') {
  // Escalate based on role + score
  if (riskScore >= 60) return 'manager'; // Manager approval
  if (riskScore >= 40) return 'supervisor'; // Supervisor approval
  if (riskScore >= 20) return 'log_only'; // Just log it
  return false;
}