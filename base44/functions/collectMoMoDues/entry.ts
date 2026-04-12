/**
 * collectMoMoDues — MTN MoMo Collections (Request-to-Pay)
 *
 * POST payload:
 *   {
 *     circleId:  string,
 *     cycleName: string,          // e.g. "Cycle 4"
 *     members: [
 *       { id, full_name, phone, contribution_amount }  // phone E.164: "233XXXXXXXXX"
 *     ]
 *   }
 *
 * Returns:
 *   { results: [ { memberId, memberName, phone, status, momoRef, amount, error? } ] }
 *
 * Required env vars (Dashboard → Settings → Environment Variables):
 *   MTN_MOMO_BASE_URL                   e.g. https://sandbox.momodeveloper.mtn.com
 *   MTN_MOMO_ENVIRONMENT                e.g. sandbox | mtnghana
 *   MTN_MOMO_COLLECTION_API_USER        UUID from MoMo sandbox provisioning
 *   MTN_MOMO_COLLECTION_API_KEY         API key for the API user
 *   MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY  Primary/secondary key from MoMo portal
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

const BASE_URL = () => Deno.env.get("MTN_MOMO_BASE_URL") || "";
const ENV      = () => Deno.env.get("MTN_MOMO_ENVIRONMENT") || "sandbox";
const SUB_KEY  = () => Deno.env.get("MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY") || "";

// MTN error codes → human-readable reasons
const MTN_ERRORS = {
  PAYER_NOT_FOUND:       "Payer MoMo account not found",
  PAYER_LIMIT_REACHED:   "Payer has reached their transaction limit",
  NOT_ALLOWED:           "Transaction not allowed for this account",
  NOT_ALLOWED_TARGET_ENVIRONMENT: "Wrong target environment configured",
  INVALID_CALLBACK_URL_HOST: "Invalid callback URL",
  INVALID_CURRENCY:      "Currency not supported",
  SERVICE_UNAVAILABLE:   "MoMo service temporarily unavailable",
  INTERNAL_PROCESSING_ERROR: "MoMo internal error — retry later",
  NOT_ENOUGH_FUNDS:      "Payer has insufficient funds",
  PAYEE_NOT_ALLOWED_TO_RECEIVE: "Payee account cannot receive funds",
  PAYMENT_NOT_APPROVED:  "Payer did not approve the payment request",
  TRANSACTION_CANCELED:  "Transaction was cancelled by the payer",
  TRANSACTION_FAILED:    "Transaction failed",
};

async function getToken() {
  const apiUser = Deno.env.get("MTN_MOMO_COLLECTION_API_USER");
  const apiKey  = Deno.env.get("MTN_MOMO_COLLECTION_API_KEY");
  const subKey  = SUB_KEY();
  const base    = BASE_URL();

  if (!base || !apiUser || !apiKey || !subKey) {
    throw new Error(
      "Missing MoMo Collection env vars. Required: MTN_MOMO_BASE_URL, MTN_MOMO_COLLECTION_API_USER, " +
      "MTN_MOMO_COLLECTION_API_KEY, MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY"
    );
  }

  const res = await fetch(`${base}/collection/token/`, {
    method: "POST",
    headers: {
      "Authorization":             `Basic ${btoa(`${apiUser}:${apiKey}`)}`,
      "Ocp-Apim-Subscription-Key": subKey,
    },
  });

  if (!res.ok) throw new Error(`MoMo auth failed (${res.status}): ${await res.text()}`);
  return (await res.json()).access_token;
}

async function requestToPay(token, member, cycleName) {
  const refId = crypto.randomUUID();

  const res = await fetch(`${BASE_URL()}/collection/v1_0/requesttopay`, {
    method: "POST",
    headers: {
      "Authorization":             `Bearer ${token}`,
      "X-Reference-Id":            refId,
      "X-Target-Environment":      ENV(),
      "Ocp-Apim-Subscription-Key": SUB_KEY(),
      "Content-Type":              "application/json",
    },
    body: JSON.stringify({
      amount:       String(member.contribution_amount),
      currency:     "GHS",
      externalId:   member.id,                          // idempotency key
      payer:        { partyIdType: "MSISDN", partyId: member.phone },
      payerMessage: `Qudi — ${cycleName} contribution`,
      payeeNote:    `Contribution from ${member.full_name}`,
    }),
  });

  if (res.status !== 202) {
    const body = await res.text();
    throw new Error(`RTP rejected (${res.status}): ${body}`);
  }
  return refId;
}

async function pollStatus(token, refId) {
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const intervals = [5000, 5000, 8000, 10000, 10000, 15000]; // up to ~53s total

  for (const wait of intervals) {
    await delay(wait);
    const res = await fetch(`${BASE_URL()}/collection/v1_0/requesttopay/${refId}`, {
      headers: {
        "Authorization":             `Bearer ${token}`,
        "X-Target-Environment":      ENV(),
        "Ocp-Apim-Subscription-Key": SUB_KEY(),
      },
    });
    if (!res.ok) continue;
    const data = await res.json();
    if (data.status === "SUCCESSFUL" || data.status === "FAILED") {
      return { status: data.status, reason: data.reason || null };
    }
  }
  return { status: "PENDING", reason: null };
}

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

  // Validate phones — MTN requires pure digits E.164 (no +)
  for (const m of members) {
    if (!m.phone || !/^\d{10,15}$/.test(m.phone)) {
      return Response.json(
        { error: `Invalid phone for ${m.full_name}: "${m.phone}" — must be E.164 digits only, e.g. 233244000001` },
        { status: 400 }
      );
    }
  }

  let token;
  try { token = await getToken(); } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }

  const results = [];
  let totalCollected = 0;

  for (const member of members) {
    let refId = null;
    try {
      refId = await requestToPay(token, member, cycleName);
      const { status, reason } = await pollStatus(token, refId);

      const humanReason = reason ? (MTN_ERRORS[reason] || reason) : null;

      // Record transaction
      await base44.asServiceRole.entities.Transaction.create({
        product_id:   member.id,
        product_name: member.full_name,
        type:         status === "SUCCESSFUL" ? "in" : "out",
        quantity:     member.contribution_amount,
        reference:    refId,
        notes:        `MoMo collection — ${cycleName} — ${status}${humanReason ? ` (${humanReason})` : ""}`,
        sync_status:  "synced",
      });

      // Update member payment status
      await base44.asServiceRole.entities.Member.update(member.id, {
        payment_status: status === "SUCCESSFUL" ? "paid"
                      : status === "FAILED"     ? "failed"
                      : "pending",
      });

      // Log notification record
      await base44.asServiceRole.entities.Notification.create({
        circle_id:   circleId,
        member_id:   member.id,
        member_name: member.full_name,
        phone:       member.phone,
        message:     status === "SUCCESSFUL"
          ? `✅ GHS ${member.contribution_amount} collected for ${cycleName}.`
          : `❌ Collection failed for ${cycleName}. ${humanReason || "Please retry."}`,
        status:  "sent",
        channel: "sms",
      });

      if (status === "SUCCESSFUL") totalCollected += member.contribution_amount;

      results.push({
        memberId:   member.id,
        memberName: member.full_name,
        phone:      member.phone,
        status,
        reason:     humanReason,
        momoRef:    refId,
        amount:     member.contribution_amount,
      });
    } catch (e) {
      results.push({
        memberId:   member.id,
        memberName: member.full_name,
        phone:      member.phone,
        status:     "ERROR",
        error:      e.message,
        momoRef:    refId,
        amount:     member.contribution_amount,
      });
    }
  }

  // Update circle pot_balance
  if (totalCollected > 0) {
    try {
      const circles = await base44.asServiceRole.entities.Circle.filter({ id: circleId });
      if (circles.length > 0) {
        const circle = circles[0];
        await base44.asServiceRole.entities.Circle.update(circleId, {
          pot_balance: (circle.pot_balance || 0) + totalCollected,
        });
      }
    } catch (e) {
      console.error("Failed to update pot_balance:", e.message);
    }
  }

  const successCount = results.filter((r) => r.status === "SUCCESSFUL").length;
  const failedCount  = results.filter((r) => r.status === "FAILED" || r.status === "ERROR").length;

  return Response.json({
    results,
    summary: {
      total:     members.length,
      succeeded: successCount,
      failed:    failedCount,
      pending:   members.length - successCount - failedCount,
      totalCollectedGHS: totalCollected,
    },
  });
});