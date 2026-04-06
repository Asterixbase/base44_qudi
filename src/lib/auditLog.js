// Comprehensive audit logging for financial transactions
import { base44 } from '@/api/base44Client';

const AUDIT_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

export async function logAuditEvent({
  event_type, // e.g. 'transaction_created', 'payout_processed', 'penalty_applied'
  entity_type, // e.g. 'Transaction', 'Payout', 'Penalty'
  entity_id,
  user_id,
  user_email,
  action, // 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT'
  level = AUDIT_LEVELS.INFO,
  changes = {}, // what changed
  metadata = {}, // additional context
  status = 'success', // 'success', 'failure', 'pending'
  error_message = null,
}) {
  const timestamp = new Date().toISOString();
  const log_entry = {
    event_type,
    entity_type,
    entity_id,
    user_id,
    user_email,
    action,
    level,
    status,
    changes: JSON.stringify(changes),
    metadata: JSON.stringify(metadata),
    error_message,
    timestamp,
  };

  // Log to console (can be replaced with external logging service)
  console.log(`[AUDIT ${level.toUpperCase()}] ${timestamp}`, {
    event: event_type,
    entity: `${entity_type}#${entity_id}`,
    action,
    user: user_email,
    status,
    ...metadata,
  });

  // For critical events, also store in database (optional)
  if (level === AUDIT_LEVELS.CRITICAL || status === 'failure') {
    try {
      // Could store in a dedicated AuditLog entity if created
      // await base44.entities.AuditLog.create(log_entry);
    } catch (err) {
      console.error('Failed to persist audit log:', err);
    }
  }

  return log_entry;
}

export async function logTransaction({
  transaction_id,
  circle_id,
  member_id,
  type, // 'collection', 'payout', 'insurance', 'guarantor_charge'
  amount,
  status, // 'success', 'pending', 'failed'
  momo_ref,
  user_email,
  error = null,
}) {
  return logAuditEvent({
    event_type: `transaction_${type}`,
    entity_type: 'Transaction',
    entity_id: transaction_id,
    user_email,
    action: 'CREATE',
    level: status === 'failed' ? AUDIT_LEVELS.ERROR : AUDIT_LEVELS.INFO,
    status,
    metadata: { circle_id, member_id, type, amount, momo_ref },
    error_message: error?.message || null,
  });
}

export async function logPenalty({
  penalty_id,
  member_id,
  circle_id,
  amount,
  action, // 'APPLY', 'WAIVE', 'SETTLE'
  user_email,
  error = null,
}) {
  return logAuditEvent({
    event_type: 'penalty_action',
    entity_type: 'Penalty',
    entity_id: penalty_id,
    user_email,
    action,
    level: error ? AUDIT_LEVELS.ERROR : AUDIT_LEVELS.INFO,
    status: error ? 'failure' : 'success',
    metadata: { member_id, circle_id, amount },
    error_message: error?.message || null,
  });
}

export async function logDispute({
  dispute_id,
  member_id,
  circle_id,
  dispute_type,
  action, // 'SUBMIT', 'REVIEW', 'HOLD', 'RESOLVE', 'REJECT'
  user_email,
  details = {},
}) {
  return logAuditEvent({
    event_type: 'dispute_action',
    entity_type: 'Dispute',
    entity_id: dispute_id,
    user_email,
    action,
    level: action === 'RESOLVE' ? AUDIT_LEVELS.CRITICAL : AUDIT_LEVELS.WARNING,
    metadata: { member_id, circle_id, dispute_type, ...details },
  });
}

export async function logCrossBorderPayout({
  payout_id,
  member_id,
  country,
  gbp_amount,
  ghs_amount,
  fca_reference,
  status,
  user_email,
  error = null,
}) {
  return logAuditEvent({
    event_type: 'cross_border_payout',
    entity_type: 'CrossBorderPayout',
    entity_id: payout_id,
    user_email,
    action: 'CREATE',
    level: status === 'failed' ? AUDIT_LEVELS.ERROR : AUDIT_LEVELS.CRITICAL,
    status,
    metadata: { member_id, country, gbp_amount, ghs_amount, fca_reference },
    error_message: error?.message || null,
  });
}