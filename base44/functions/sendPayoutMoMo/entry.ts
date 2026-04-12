/**
 * sendPayoutMoMo — MTN MoMo Disbursements (Transfer)
 *
 * POST payload:
 *   {
 *     circleId:  string,
 *     cycleName: string,           // e.g. "Cycle 4"
 *     member: {
 *       id, full_name, phone,      // phone E.164 digits only: "233XXXXXXXXX"
 *       payout_amount              // GHS number
 *     }
 *   }
 *
 * Returns:
 *   { status, momoRef, memberName, phone, amount, reason? }
 *
 * Required env vars (Dashboard → Settings → Environment Variables):
 *   MTN_MOMO_BASE_URL
 *   MTN_MOMO_ENVIRONMENT                      e.g. sandbox | mtnghana
 *   MTN_MOMO_DISBURSEMENT_API_USER            UUID
 *   MTN_MOMO_DISBURSEMENT_API_KEY
 *   MTN_MOMO_DISBURSEMENT_SUBSCRIPTION_KEY
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

const BASE_URL = () => Deno.env.get("MTN_MOMO_BASE_URL") || "";
const ENV      = () => Deno.env.get("MTN_MOMO_ENVIRONMENT") || "sandbox";
const SUB_KEY  = () => Deno.env.get("MTN_MOMO_DISBURSEMENT_SUBSCRIPTION_KEY") || "";

const MTN_ERRORS = {
  PAYEE_NOT_FOUND:       "Payee MoMo account not found",
  NOT_ENOUGH_FUNDS:      "Insufficient funds in the disbursement wallet",
  NOT_ALLOWED:           "Transaction not allowed for this account",
  SERVICE_UNAVAILABLE:   "MoMo service temporarily unavailable",
  INTERNAL_PROCESSING_ERROR: "MoMo internal error — retry later",
  PAYEE_NOT_ALLOWED_TO_RECEIVE: "Payee account cannot receive funds",
  TRANSFER_LIMIT_REACHED: "Transfer limit reached for this account",
  TRANSACTION_CANCELED:  "Transaction cancelled",
  TRANSACTION_FAILED:    "Transaction failed",
};

async function getToken() {
  const apiUser = Deno.env.get("MTN_MOMO_DISBURSEMENT_API_USER");
  const apiKey  = Deno.env.get("MTN_MOMO_DISBURSEMENT_API_KEY");
  const subKey  = SUB_KEY();
  const base    = BASE_URL();

  if (!base || !apiUser || !apiKey || !subKey) {
    throw new Error(
      "Missing MoMo Disbursement env vars. Required: MTN_MOMO_BASE_URL, MTN_MOMO_DISBURSEMENT_API_USER, " +
      "MTN_MOMO_DISBURSEMENT_API_KEY, MTN_MOMO_DISBURSEMENT_SUBSCRIPTION_KEY"
    );
  }

  const res = await fetch(`${base}/disbursement/token/`, {
    method: "POST",
    headers: {
      "Authorization":             `Basic ${btoa(`${apiUser}:${apiKey}`)}`,
      "Ocp-Apim-Subscription-Key": subKey,
    },
  });

  if (!res.ok) throw new Error(`MoMo disbursement auth failed (${res.status}): ${await res.text()}`);
  return (await res.json()).access_token;
}

async function checkAccountBalance(token) {
  const res = await fetch(`${BASE_URL()}/disbursement/v1_0/account/balance`, {
    headers: {
      "Authorization":             `Bearer ${token}`,
      "X-Target-Environment":      ENV(),
      "Ocp-Apim-Subscription-Key": SUB_KEY(),
    },
  });
  if (!res.ok) return null; // non-fatal — proceed optimistically
  const data = await res.json();
  return parseFloat(data.availableBalance || "0");
}

async function validatePayeeAccount(token, phone) {
  const res = await fetch(
    `${BASE_URL()}/disbursement/v1_0/accountholder/msisdn/${phone}/active`,
    {
      headers: {
        "Authorization":             `Bearer ${token}`,
        "X-Target-Environment":      ENV(),
        "Ocp-Apim-Subscription-Key": SUB_KEY(),
      },
    }
  );
  if (!res.ok) return true; // non-fatal — proceed optimistically
  const data = await res.json();
  return data.result === true;
}

async function sendTransfer(token, member, cycleName) {
  const refId = crypto.randomUUID();

  const res = await fetch(`${BASE_URL()}/disbursement/v1_0/transfer`, {
    method: "POST",
    headers: {
      "Authorization":             `Bearer ${token}`,
      "X-Reference-Id":            refId,
      "X-Target-Environment":      ENV(),
      "Ocp-Apim-Subscription-Key": SUB_KEY(),
      "Content-Type":              "application/json",
    },
    body: JSON.stringify({
      amount:       String(member.payout_amount),
      currency:     "GHS",
      externalId:   member.id,                     // idempotency key
      payee:        { partyIdType: "MSISDN", partyId: member.phone },
      payerMessage: `Qudi Circle Payout — ${cycleName}`,
      payeeNote:    `Payout to ${member.full_name} — ${cycleName}`,
    }),
  });

  if (res.status !== 202) {
    const body = await res.text();
    throw new Error(`Transfer rejected (${res.status}): ${body}`);
  }
  return refId;
}

async function pollTransferStatus(token, refId) {
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const intervals = [5000, 5000, 8000, 10000, 10000, 15000];

  for (const wait of intervals) {
    await delay(wait);
    const res = await fetch(`${BASE_URL()}/disbursement/v1_0/transfer/${refId}`, {
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

  const { circleId, cycleName = "Payout", member } = body;

  if (!circleId || !member?.id || !member?.phone || !member?.payout_amount) {
    return Response.json(
      { error: "circleId, member.id, member.phone, and member.payout_amount are required" },
      { status: 400 }
    );
  }

  if (!/^\d{10,15}$/.test(member.phone)) {
    return Response.json(
      { error: `Invalid phone "${member.phone}" — must be E.164 digits only, e.g. 233244000001` },
      { status: 400 }
    );
  }

  let token;
  try { token = await getToken(); } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }

  // Pre-flight: balance check
  const balance = await checkAccountBalance(token);
  if (balance !== null && balance < member.payout_amount) {
    return Response.json(
      {
        error: `Insufficient disbursement wallet balance. Available: GHS ${balance}, Required: GHS ${member.payout_amount}`,
        balance,
      },
      { status: 422 }
    );
  }

  // Pre-flight: validate payee account
  const payeeActive = await validatePayeeAccount(token, member.phone);
  if (!payeeActive) {
    return Response.json(
      { error: `Payee MoMo account not active for phone ${member.phone}` },
      { status: 422 }
    );
  }

  let refId;
  try {
    refId = await sendTransfer(token, member, cycleName);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }

  const { status, reason } = await pollTransferStatus(token, refId);
  const humanReason = reason ? (MTN_ERRORS[reason] || reason) : null;

  // Record transaction
  await base44.asServiceRole.entities.Transaction.create({
    product_id:   member.id,
    product_name: member.full_name,
    type:         "out",
    quantity:     member.payout_amount,
    reference:    refId,
    notes:        `MoMo payout — ${cycleName} — ${status}${humanReason ? ` (${humanReason})` : ""}`,
    sync_status:  "synced",
  });

  // Update member & circle on success
  if (status === "SUCCESSFUL") {
    await base44.asServiceRole.entities.Member.update(member.id, {
      has_received_payout: true,
    });

    // Deduct from circle pot_balance
    try {
      const circles = await base44.asServiceRole.entities.Circle.filter({ id: circleId });
      if (circles.length > 0) {
        const circle = circles[0];
        await base44.asServiceRole.entities.Circle.update(circleId, {
          pot_balance: Math.max(0, (circle.pot_balance || 0) - member.payout_amount),
        });
      }
    } catch (e) {
      console.error("Failed to update pot_balance after payout:", e.message);
    }
  }

  // Log notification record
  await base44.asServiceRole.entities.Notification.create({
    circle_id:   circleId,
    member_id:   member.id,
    member_name: member.full_name,
    phone:       member.phone,
    message:     status === "SUCCESSFUL"
      ? `🎉 Your payout of GHS ${member.payout_amount} for ${cycleName} has been sent to your MoMo account.`
      : `❌ Payout of GHS ${member.payout_amount} failed. ${humanReason || "Please contact your organiser."}`,
    status:  "sent",
    channel: "sms",
  });

  return Response.json({
    status,
    reason:     humanReason,
    momoRef:    refId,
    memberName: member.full_name,
    phone:      member.phone,
    amount:     member.payout_amount,
    balance,
  });
});