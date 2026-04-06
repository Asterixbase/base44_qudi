/**
 * Qudi Trust Scoring Algorithm
 * Adjusts a member's base trust score based on current cycle payment behaviour.
 *
 * Rules:
 *  +15  Early payment (paid + high existing score signals consistent early payer)
 *  +8   On-time payment
 *  -10  Payment pending (past expected date — cycle already in progress)
 *  -20  Payment failed
 *  -25  Payment overdue
 *
 * Score is clamped to [0, 100].
 */

const DELTA = {
  paid_early:  +15,
  paid:        +8,
  pending:     -10,
  failed:      -20,
  overdue:     -25,
};

/**
 * Determine if a "paid" member likely paid early.
 * Heuristic: base score ≥ 80 and no history of failures → early payer pattern.
 */
function isEarlyPayer(member) {
  return member.payment_status === 'paid' && (member.trust_score || 0) >= 80;
}

/**
 * Calculate a new trust score for a single member.
 * @param {object} member — entity with trust_score and payment_status
 * @returns {{ score: number, delta: number, reason: string }}
 */
export function calcTrustScore(member) {
  const base = member.trust_score ?? 50;
  let delta = 0;
  let reason = '';

  if (member.payment_status === 'paid') {
    if (isEarlyPayer(member)) {
      delta = DELTA.paid_early;
      reason = 'Early payment';
    } else {
      delta = DELTA.paid;
      reason = 'On-time payment';
    }
  } else if (member.payment_status === 'pending') {
    delta = DELTA.pending;
    reason = 'Payment pending';
  } else if (member.payment_status === 'failed') {
    delta = DELTA.failed;
    reason = 'Payment failed';
  } else if (member.payment_status === 'overdue') {
    delta = DELTA.overdue;
    reason = 'Payment overdue';
  }

  const score = Math.min(100, Math.max(0, base + delta));
  return { score, delta, reason };
}

/**
 * Enrich an array of members with computed trust scores.
 */
export function enrichMembersWithTrust(members) {
  return members.map(m => {
    const { score, delta, reason } = calcTrustScore(m);
    return { ...m, trust_score: score, trust_delta: delta, trust_reason: reason };
  });
}