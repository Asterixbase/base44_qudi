/**
 * collectMoMoDues — MTN MoMo Collections (Request-to-Pay)
 *
 * POST payload:
 *   {
 *     circleId:  string,
 *     cycleName: string,            // e.g. "Cycle 4"
 *     members: [
 *       { id, full_name, phone, contribution_amount }  // phone in E.164, e.g. "233XXXXXXXXX"
 *     ]
 *   }
 *
 * Returns:
 *   { results: [ { memberId, memberName, phone, status, momoRef, error? } ] }
 *
 * Env vars needed (Dashboard → Settings → Environment Variables):
 *   MTN_MOMO_BASE_URL, MTN_MOMO_ENVIRONMENT,
 *   MTN_MOMO_COLLECTION_API_USER, MTN_MOMO_COLLECTION_API_KEY,
 *   MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

async function getCollectionToken() {
  const BASE_URL = Deno.env.get("MTN_MOMO_BASE_URL");
  const apiUser  = Deno.env.get("MTN_MOMO_COLLECTION_API_USER");
  const apiKey   = Deno.env.get("MTN_MOMO_COLLECTION_API_KEY");
  const subKey   = Deno.env.get("MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY");

  if (!BASE_URL || !apiUser || !apiKey || !subKey) {
    throw new Error("Missing MTN MoMo Collection env vars. Set them in Dashboard → Settings → Environment Variables.");
  }

  const res = await fetch(`${BASE_URL}/collection/token/`, {
    method: "POST",
    headers: {
      "Authorization":             `Basic ${btoa(`${apiUser}:${apiKey}`)}`,
      "Ocp-Apim-Subscription-Key": subKey,
    },
  });

  if (!res.ok) throw new Error(`MoMo token error (${res.status}): ${await res.text()}`);
  return (await res.json()).access_token;
}

async function requestToPay(token, member, cycleName) {
  const BASE_URL = Deno.env.get("MTN_MOMO_BASE_URL");
  const ENV      = Deno.env.get("MTN_MOMO_ENVIRONMENT") || "sandbox";
  const subKey   = Deno.env.get("MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY");
  const refId    = crypto.randomUUID();

  const res = await fetch(`${BASE_URL}/collection/v1_0/requesttopay`, {
    method: "POST",
    headers: {
      "Authorization":             `Bearer ${token}`,
      "X-Reference-Id":            refId,
      "X-Target-Environment":      ENV,
      "Ocp-Apim-Subscription-Key": subKey,
      "Content-Type":              "application/json",
    },
    body: JSON.stringify({
      amount:       String(member.contribution_amount),
      currency:     "GHS",
      externalId:   refId,
      payer:        { partyIdType: "MSISDN", partyId: member.phone },
      payerMessage: `Qudi Circle — ${cycleName}`,
      payeeNote:    `Contribution from ${member.full_name}`,
    }),
  });

  if (res.status !== 202) throw new Error(`RTP failed (${res.status}): ${await res.text()}`);
  return refId;
}

async function pollRTPStatus(token, refId) {
  const BASE_URL = Deno.env.get("MTN_MOMO_BASE_URL");
  const ENV      = Deno.env.get("MTN_MOMO_ENVIRONMENT") || "sandbox";
  const subKey   = Deno.env.get("MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY");
  const delay    = (ms) => new Promise((r) => setTimeout(r, ms));

  for (let i = 0; i < 6; i++) {
    await delay(5000);
    const res = await fetch(`${BASE_URL}/collection/v1_0/requesttopay/${refId}`, {
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

  const { circleId, cycleName = "Contribution", members = [] } = await req.json();

  if (!circleId || members.length === 0) {
    return Response.json({ error: "circleId and members[] are required" }, { status: 400 });
  }

  let token;
  try {
    token = await getCollectionToken();
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }

  const results = [];

  for (const member of members) {
    try {
      const refId       = await requestToPay(token, member, cycleName);
      const finalStatus = await pollRTPStatus(token, refId);

      await base44.asServiceRole.entities.Transaction.create({
        product_id:   member.id,
        product_name: member.full_name,
        type:         finalStatus === "SUCCESSFUL" ? "in" : "out",
        quantity:     member.contribution_amount,
        reference:    refId,
        notes:        `MoMo collection — ${cycleName} — ${finalStatus}`,
        sync_status:  "synced",
      });

      await base44.asServiceRole.entities.Member.update(member.id, {
        payment_status: finalStatus === "SUCCESSFUL" ? "paid"
                      : finalStatus === "FAILED"     ? "failed"
                      : "pending",
      });

      results.push({ memberId: member.id, memberName: member.full_name, phone: member.phone, status: finalStatus, momoRef: refId });
    } catch (e) {
      results.push({ memberId: member.id, memberName: member.full_name, phone: member.phone, status: "ERROR", error: e.message });
    }
  }

  return Response.json({ results });
});