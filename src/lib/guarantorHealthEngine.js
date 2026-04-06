/**
 * Guarantor Health Engine
 * Aggregates trust scores and performance of members guaranteed by a single user.
 */
import { base44 } from '@/api/base44Client';

export async function getGuarantorMetrics(guarantorName) {
  const [members, transactions, penalties] = await Promise.all([
    base44.entities.Member.filter({ guarantor_name: guarantorName }, '-created_date', 100),
    base44.entities.Transaction.list('-created_date', 500),
    base44.entities.PenaltyLedger.list('-created_date', 500),
  ]);

  if (members.length === 0) return null;

  // Calculate per-member trust scores
  const memberMetrics = members.map(m => {
    const memberTxs = transactions.filter(t => t.member_id === m.id && t.type === 'collection');
    const memberPens = penalties.filter(p => p.member_id === m.id);
    const paid = memberTxs.filter(t => t.status === 'success').length;
    const total = memberTxs.length || 1;
    const paymentRate = Math.round((paid / total) * 100);

    const penaltyCount = memberPens.length;
    const penaltyDeduction = Math.min(30, penaltyCount * 5);
    const baseScore = Math.round(paymentRate * 0.8) - penaltyDeduction + (m.is_verified ? 10 : 0);
    const trustScore = Math.max(0, Math.min(100, baseScore));

    return {
      id: m.id,
      full_name: m.full_name,
      trustScore,
      paymentRate,
      penaltyCount,
      outstandingPenalties: memberPens.filter(p => p.settlement_status === 'outstanding').reduce((s, p) => s + (p.penalty_amount || 0), 0),
      isVerified: m.is_verified,
      hasReceivedPayout: m.has_received_payout,
    };
  });

  // Aggregate metrics
  const avgTrustScore = Math.round(memberMetrics.reduce((s, m) => s + m.trustScore, 0) / memberMetrics.length);
  const avgPaymentRate = Math.round(memberMetrics.reduce((s, m) => s + m.paymentRate, 0) / memberMetrics.length);
  const totalPenalties = memberMetrics.reduce((s, m) => s + m.penaltyCount, 0);
  const verifiedCount = memberMetrics.filter(m => m.isVerified).length;
  const outstandingTotal = memberMetrics.reduce((s, m) => s + m.outstandingPenalties, 0);
  const payoutCount = memberMetrics.filter(m => m.hasReceivedPayout).length;

  // Risk scoring: penalizes low trust, high penalties, and inconsistency
  const trustRiskFactor = Math.max(0, 100 - avgTrustScore); // Higher = more risk
  const penaltyRiskFactor = totalPenalties > 5 ? 40 : totalPenalties > 2 ? 20 : 0;
  const consistencyRiskFactor = avgPaymentRate < 60 ? 30 : avgPaymentRate < 80 ? 15 : 0;
  const riskScore = Math.min(100, Math.round((trustRiskFactor * 0.4 + penaltyRiskFactor + consistencyRiskFactor) / 2));

  return {
    guarantorName,
    memberCount: members.length,
    avgTrustScore,
    avgPaymentRate,
    totalPenalties,
    verifiedCount,
    outstandingTotal,
    payoutCount,
    riskScore,
    riskLevel: riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
    members: memberMetrics.sort((a, b) => a.trustScore - b.trustScore),
  };
}

export async function getAllGuarantors() {
  const members = await base44.entities.Member.list('-created_date', 1000);
  const guarantorNames = new Set(
    members
      .filter(m => m.guarantor_name && m.guarantor_name.trim() !== '')
      .map(m => m.guarantor_name)
  );
  return Array.from(guarantorNames).sort();
}

export async function getAllGuarantorHealth() {
  const guarantors = await getAllGuarantors();
  const health = await Promise.all(guarantors.map(name => getGuarantorMetrics(name)));
  return health.filter(h => h !== null).sort((a, b) => b.riskScore - a.riskScore);
}

export async function flagGuarantor(guarantorName, reason) {
  // Create a system notification for audit
  const timestamp = new Date().toISOString();
  const auditEntry = `Guarantor "${guarantorName}" flagged as high-risk. Reason: ${reason || 'No reason provided'}. Time: ${timestamp}`;
  // Could store this in a dedicated Audit entity if it exists
  return { success: true, guarantorName, reason, timestamp };
}

export async function unflagGuarantor(guarantorName) {
  const timestamp = new Date().toISOString();
  return { success: true, guarantorName, unflaggedAt: timestamp };
}