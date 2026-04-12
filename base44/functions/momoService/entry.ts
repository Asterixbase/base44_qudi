/**
 * momoService — MTN MoMo utility service (balance / status / phone validation)
 * STATUS: PLACEHOLDER — returns simulated responses until MTN MoMo credentials are configured.
 *
 * POST payload:
 *   {
 *     action: "balance" | "status" | "validate_phone",
 *     product: "collection" | "disbursement",
 *     refId:  string,   // for action=status
 *     phone:  string,   // for action=validate_phone
 *   }
 *
 * When ready for live: set MTN MoMo env vars in Dashboard → Settings → Environment Variables.
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role !== "admin") {
    return Response.json({ error: "Forbidden: admin only" }, { status: 403 });
  }

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, product = "disbursement", refId, phone } = body;

  if (action === "balance") {
    return Response.json({
      simulated:        true,
      note:             "Live MoMo not configured.",
      product,
      availableBalance: 10000.00,
      currency:         "GHS",
    });
  }

  if (action === "status") {
    if (!refId) return Response.json({ error: "refId required" }, { status: 400 });
    return Response.json({
      simulated: true,
      note:      "Live MoMo not configured.",
      refId,
      status:    "SUCCESSFUL",
    });
  }

  if (action === "validate_phone") {
    if (!phone) return Response.json({ error: "phone required" }, { status: 400 });
    return Response.json({
      simulated: true,
      note:      "Live MoMo not configured.",
      phone,
      active:    true,
    });
  }

  return Response.json(
    { error: "Unknown action. Valid: balance | status | validate_phone" },
    { status: 400 }
  );
});