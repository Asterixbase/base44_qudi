/**
 * collectMoMoDues — MTN MoMo Collections (Request-to-Pay)
 * STATUS: PLACEHOLDER — returns simulated responses until MTN MoMo credentials are configured.
 *
 * POST payload:
 *   {
 *     circleId:  string,
 *     cycleName: string,
 *     members: [ { id, full_name, phone, contribution_amount } ]
 *   }
 *
 * When ready for live:
 *   Set env vars in Dashboard → Settings → Environment Variables:
 *   MTN_MOMO_BASE_URL, MTN_MOMO_ENVIRONMENT,
 *   MTN_MOMO_COLLECTION_API_USER, MTN_MOMO_COLLECTION_API_KEY,
 *   MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY
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

  const { circleId, cycleName = "Contribution", members = [] } = body;

  if (!circleId || members.length === 0) {
    return Response.json({ error: "circleId and members[] are required" }, { status: 400 });
  }

  // Simulate a short processing delay
  await new Promise((r) => setTimeout(r, 800));

  const results = [];
  let totalCollected = 0;

  for (const member of members) {
    const refId = crypto.randomUUID();
    // Simulate: 80% success, 20% pending (no failures in sandbox sim)
    const status = Math.random() > 0.2 ? "SUCCESSFUL" : "PENDING";

    // Update member payment status in DB
    await base44.asServiceRole.entities.Member.update(member.id, {
      payment_status: status === "SUCCESSFUL" ? "paid" : "pending",
    });

    // Record transaction
    await base44.asServiceRole.entities.Transaction.create({
      product_id:   member.id,
      product_name: member.full_name,
      type:         "in",
      quantity:     member.contribution_amount,
      reference:    refId,
      notes:        `[SIMULATED] MoMo collection — ${cycleName} — ${status}`,
      sync_status:  "pending",
    });

    if (status === "SUCCESSFUL") totalCollected += member.contribution_amount;

    results.push({
      memberId:   member.id,
      memberName: member.full_name,
      phone:      member.phone,
      status,
      momoRef:    refId,
      amount:     member.contribution_amount,
      simulated:  true,
    });
  }

  // Update circle pot_balance
  if (totalCollected > 0) {
    const circles = await base44.asServiceRole.entities.Circle.filter({ id: circleId });
    if (circles.length > 0) {
      await base44.asServiceRole.entities.Circle.update(circleId, {
        pot_balance: (circles[0].pot_balance || 0) + totalCollected,
      });
    }
  }

  const successCount = results.filter((r) => r.status === "SUCCESSFUL").length;

  return Response.json({
    simulated: true,
    note: "Live MTN MoMo not yet configured. Set env vars to enable real collections.",
    results,
    summary: {
      total:             members.length,
      succeeded:         successCount,
      pending:           members.length - successCount,
      failed:            0,
      totalCollectedGHS: totalCollected,
    },
  });
});