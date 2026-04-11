/**
 * sendPayoutMoMo — MTN MoMo Disbursements (Transfer)
 *
 * POST payload:
 *   {
 *     circleId:  string,
 *     cycleName: string,            // e.g. "Cycle 4"
 *     member: {
 *       id, full_name, phone,       // phone E.164 e.g. "233XXXXXXXXX"
 *       payout_amount               // GHS number
 *     }
 *   }
 *
 * Returns:
 *   { status, momoRef, memberName, phone, amount }
 *
 * Env vars needed (Dashboard → Settings → Environment Variables):
 *   MTN_MOMO_BASE_URL, MTN_MOMO_ENVIRONMENT,
 *   MTN_MOMO_DISBURSEMENT_API_USER, MTN_MOMO_DISBURSEMENT_API_KEY,
 *   MTN_MOMO_DISBURSEMENT_SUBSCRIPTION_KEY
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

async function getDisbursementToken() {
  const BASE_URL = Deno.env.get("MTN_MOMO_BASE_URL");
  const apiUser  = Deno.env.get("MTN_MOMO_DISBURSEMENT_API_USER");
  const apiKey   = Deno.env.get("MTN_MOMO_DISBURSEMENT_API_KEY");
  const subKey   = Deno.env.get("MTN_MOMO_DISBURSEMENT_SUBSCRIPTION_KEY");

  if (!BASE_URL || !apiUser || !apiKey || !subKey) {
    throw new Error("Missing MTN MoMo Disbursement env vars. Set them in Dashboard → Settings → Environment Variables.");
  }

  const res = await fetch(`${BASE_URL}/disbursement/token/`, {
    method: "POST",
    headers: {
      "Authorization":             `Basic ${btoa(`${apiUser}:${apiKey}`)}`,
      "Ocp-Apim-Subscription-Key": subKey,
    },
  });

  if (!res.ok) throw new Error(`MoMo disbursement token error (${res.status}): ${await res.text()}`);
  return (await res.json()).access_token;
}

async function sendTransfer(token, member, cycleName) {
  const BASE_URL = Deno.env.get("MTN_MOMO_BASE_URL");
  const ENV      = Deno.env.get("MTN_MOMO_ENVIRONMENT") || "sandbox";
  const subKey   = Deno.env.get("MTN_MOMO_DISBURSEMENT_SUBSCRIPTION_KEY");
  const refId    = crypto.randomUUID();

  const res = await fetch(`${BASE_URL}/disbursement/v1_0/transfer`, {
    method: "POST",
    headers: {
      "Authorization":             `Bearer ${token}`,
      "X-Reference-Id":            refId,
      "X-Target-Environment":      ENV,
      "Ocp-Apim-Subscription-Key": subKey,
      "Content-Type":              "application/json",
    },
    body: JSON.stringify({
      amount:       String(member.payout_amount),
      currency:     "GHS",
      externalId:   refId,
      payee:        { partyIdType: "MSISDN", partyId: member.phone },
      payerMessage: `Qudi Circle Payout — ${cycleName}`,
      payeeNote:    `Payout to ${member.full_name} for ${cycleName}`,
    }),
  });

  if (res.status !== 202) throw new Error(`Transfer failed (${res.status}): ${await res.text()}`);
  return refId;
}

async function pollTransferStatus(token, refId) {
  const BASE_URL = Deno.env.get("MTN_MOMO_BASE_URL");
  const ENV      = Deno.env.get("MTN_MOMO_ENVIRONMENT") || "sandbox";
  const subKey   = Deno.env.get("MTN_MOMO_DISBURSEMENT_SUBSCRIPTION_KEY");
  const delay    = (ms) => new Promise((r) => setTimeout(r, ms));

  for (let i = 0; i < 6; i++) {
    await delay(5000);
    const res = await fetch(`${BASE_URL}/disbursement/v1_0/transfer/${refId}`, {
      headers: {
        "Authorization":             `Bearer ${token}`,
        "X-Target-Environment":      ENV,
        "Ocp-Apim-Subscription-Key": subKey,
      },
    });
    if (!res.ok) continue;
    const data = await res.json();
    if (data.status === "SUCCESSFUL" || data.status === "FAILED") return data.status;
  }
  return "PENDING";
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { circleId, cycleName = "Payout", member } = await req.json();

  if (!circleId || !member?.id || !member?.phone || !member?.payout_amount) {
    return Response.json(
      { error: "circleId, member.id, member.phone, and member.payout_amount are required" },
      { status: 400 }
    );
  }

  let token;
  try {
    token = await getDisbursementToken();
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }

  const refId       = await sendTransfer(token, member, cycleName);
  const finalStatus = await pollTransferStatus(token, refId);

  await base44.asServiceRole.entities.Transaction.create({
    product_id:   member.id,
    product_name: member.full_name,
    type:         "out",
    quantity:     member.payout_amount,
    reference:    refId,
    notes:        `MoMo payout — ${cycleName} — ${finalStatus}`,
    sync_status:  "synced",
  });

  if (finalStatus === "SUCCESSFUL") {
    await base44.asServiceRole.entities.Member.update(member.id, {
      has_received_payout: true,
    });
  }

  return Response.json({
    status:     finalStatus,
    momoRef:    refId,
    memberName: member.full_name,
    phone:      member.phone,
    amount:     member.payout_amount,
  });
});