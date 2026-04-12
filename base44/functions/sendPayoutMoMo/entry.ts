/**
 * sendPayoutMoMo — MTN MoMo Disbursements (Transfer)
 * STATUS: PLACEHOLDER — returns simulated responses until MTN MoMo credentials are configured.
 *
 * POST payload:
 *   {
 *     circleId:  string,
 *     cycleName: string,
 *     member: { id, full_name, phone, payout_amount }
 *   }
 *
 * When ready for live:
 *   Set env vars in Dashboard → Settings → Environment Variables:
 *   MTN_MOMO_BASE_URL, MTN_MOMO_ENVIRONMENT,
 *   MTN_MOMO_DISBURSEMENT_API_USER, MTN_MOMO_DISBURSEMENT_API_KEY,
 *   MTN_MOMO_DISBURSEMENT_SUBSCRIPTION_KEY
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { circleId, cycleName = "Payout", member } = body;

  if (!circleId || !member?.id || !member?.phone || !member?.payout_amount) {
    return Response.json(
      { error: "circleId, member.id, member.phone, and member.payout_amount are required" },
      { status: 400 }
    );
  }

  // Simulate processing delay
  await new Promise((r) => setTimeout(r, 800));

  const refId = crypto.randomUUID();
  const status = "SUCCESSFUL"; // Always succeeds in simulation

  // Record transaction
  await base44.asServiceRole.entities.Transaction.create({
    product_id:   member.id,
    product_name: member.full_name,
    type:         "out",
    quantity:     member.payout_amount,
    reference:    refId,
    notes:        `[SIMULATED] MoMo payout — ${cycleName} — ${status}`,
    sync_status:  "pending",
  });

  // Mark member as paid out
  await base44.asServiceRole.entities.Member.update(member.id, {
    has_received_payout: true,
  });

  // Deduct from circle pot_balance
  const circles = await base44.asServiceRole.entities.Circle.filter({ id: circleId });
  if (circles.length > 0) {
    await base44.asServiceRole.entities.Circle.update(circleId, {
      pot_balance: Math.max(0, (circles[0].pot_balance || 0) - member.payout_amount),
    });
  }

  return Response.json({
    simulated:  true,
    note:       "Live MTN MoMo not yet configured. Set env vars to enable real disbursements.",
    status,
    momoRef:    refId,
    memberName: member.full_name,
    phone:      member.phone,
    amount:     member.payout_amount,
  });
});