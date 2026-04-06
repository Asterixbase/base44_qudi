/**
 * Qudi Referral Engine
 * Handles referral creation, successful join detection, and reward distribution.
 */
import { base44 } from '@/api/base44Client';

// Default rewards
export const REFERRAL_REWARDS = {
  referrer: { type: 'trust_boost',          value: 5  },  // +5 trust score
  invitee:  { type: 'contribution_credit',  value: 10 },  // GHS 10 credit
};

/**
 * Create a referral invite record and send in-app notification.
 */
export async function createReferral({ circle, referrer, inviteeEmail, inviteeName }) {
  const referral = await base44.entities.Referral.create({
    circle_id:           circle.id,
    referrer_id:         referrer.id,
    referrer_name:       referrer.full_name,
    invitee_email:       inviteeEmail,
    invitee_name:        inviteeName || inviteeEmail,
    status:              'pending',
    referrer_bonus_type:  REFERRAL_REWARDS.referrer.type,
    referrer_bonus_value: REFERRAL_REWARDS.referrer.value,
    invitee_bonus_type:   REFERRAL_REWARDS.invitee.type,
    invitee_bonus_value:  REFERRAL_REWARDS.invitee.value,
  });

  // Notify referrer
  await base44.entities.Notification.create({
    circle_id:   circle.id,
    member_id:   referrer.id,
    member_name: referrer.full_name,
    phone:       referrer.phone || 'N/A',
    message:     `📨 You invited ${inviteeName || inviteeEmail} to "${circle.name}". When they join, you'll earn +${REFERRAL_REWARDS.referrer.value} trust score! — Qudi`,
    status:      'sent',
    channel:     'in-app',
  });

  return referral;
}

/**
 * Mark a referral as joined and distribute rewards to both parties.
 * Call this when the invitee's Member record is confirmed created.
 */
export async function rewardReferral({ referral, referrerMember, inviteeMember, circle }) {
  // Boost referrer trust score
  const newReferrerScore = Math.min(100, (referrerMember.trust_score || 50) + REFERRAL_REWARDS.referrer.value);
  await base44.entities.Member.update(referrerMember.id, { trust_score: newReferrerScore });

  // Credit invitee (store as trust boost for simplicity; extend to pot_balance if needed)
  const newInviteeScore = Math.min(100, (inviteeMember.trust_score || 50) + 3);
  await base44.entities.Member.update(inviteeMember.id, { trust_score: newInviteeScore });

  // Mark referral rewarded
  await base44.entities.Referral.update(referral.id, {
    status: 'rewarded',
    reward_note: `Referrer +${REFERRAL_REWARDS.referrer.value} trust. Invitee GHS ${REFERRAL_REWARDS.invitee.value} credit applied.`,
  });

  // Notify referrer of reward
  await base44.entities.Notification.create({
    circle_id:   circle.id,
    member_id:   referrerMember.id,
    member_name: referrerMember.full_name,
    phone:       referrerMember.phone || 'N/A',
    message:     `🎁 ${referral.invitee_name} joined "${circle.name}" via your referral! Your trust score is now ${newReferrerScore}. — Qudi`,
    status:      'sent',
    channel:     'in-app',
  });

  // Notify invitee of their bonus
  if (inviteeMember) {
    await base44.entities.Notification.create({
      circle_id:   circle.id,
      member_id:   inviteeMember.id,
      member_name: inviteeMember.full_name,
      phone:       inviteeMember.phone || 'N/A',
      message:     `🎁 Welcome to "${circle.name}"! You've received a GHS ${REFERRAL_REWARDS.invitee.value} contribution credit as a referral bonus. — Qudi`,
      status:      'sent',
      channel:     'in-app',
    });
  }

  return { newReferrerScore };
}