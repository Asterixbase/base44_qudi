/**
 * momoService — MTN MoMo utility service
 *
 * Provides balance inquiry, transaction status lookup, and phone account validation.
 * Used by admin dashboards and reconciliation screens.
 *
 * POST payload:
 *   {
 *     action: "balance" | "status" | "validate_phone",
 *     product: "collection" | "disbursement",  // required for balance
 *     refId:   string,                          // required for status
 *     phone:   string,                          // required for validate_phone (digits E.164)
 *   }
 *
 * Required env vars: same as collectMoMoDues / sendPayoutMoMo
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

const BASE_URL = () => Deno.env.get("MTN_MOMO_BASE_URL") || "";
const ENV      = () => Deno.env.get("MTN_MOMO_ENVIRONMENT") || "sandbox";

async function getToken(product) {
  const isCollection = product === "collection";
  const apiUser = Deno.env.get(isCollection ? "MTN_MOMO_COLLECTION_API_USER"    : "MTN_MOMO_DISBURSEMENT_API_USER");
  const apiKey  = Deno.env.get(isCollection ? "MTN_MOMO_COLLECTION_API_KEY"     : "MTN_MOMO_DISBURSEMENT_API_KEY");
  const subKey  = Deno.env.get(isCollection ? "MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY" : "MTN_MOMO_DISBURSEMENT_SUBSCRIPTION_KEY");
  const base    = BASE_URL();

  if (!base || !apiUser || !apiKey || !subKey) {
    throw new Error(`Missing MoMo env vars for product: ${product}`);
  }

  const res = await fetch(`${base}/${product}/token/`, {
    method: "POST",
    headers: {
      "Authorization":             `Basic ${btoa(`${apiUser}:${apiKey}`)}`,
      "Ocp-Apim-Subscription-Key": subKey,
    },
  });

  if (!res.ok) throw new Error(`Auth failed (${res.status}): ${await res.text()}`);
  return { token: (await res.json()).access_token, subKey };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Admin-only
  if (user.role !== "admin") {
    return Response.json({ error: "Forbidden: admin only" }, { status: 403 });
  }

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, product = "disbursement", refId, phone } = body;

  // ── Balance inquiry ──────────────────────────────────────────────────────────
  if (action === "balance") {
    const { token, subKey } = await getToken(product);
    const res = await fetch(`${BASE_URL()}/${product}/v1_0/account/balance`, {
      headers: {
        "Authorization":             `Bearer ${token}`,
        "X-Target-Environment":      ENV(),
        "Ocp-Apim-Subscription-Key": subKey,
      },
    });
    if (!res.ok) return Response.json({ error: `Balance check failed (${res.status}): ${await res.text()}` }, { status: 502 });
    const data = await res.json();
    return Response.json({
      product,
      availableBalance: parseFloat(data.availableBalance || "0"),
      currency:         data.currency,
    });
  }

  // ── Transaction status lookup ────────────────────────────────────────────────
  if (action === "status") {
    if (!refId) return Response.json({ error: "refId is required for action=status" }, { status: 400 });

    const { token, subKey } = await getToken(product);
    const path = product === "collection"
      ? `collection/v1_0/requesttopay/${refId}`
      : `disbursement/v1_0/transfer/${refId}`;

    const res = await fetch(`${BASE_URL()}/${path}`, {
      headers: {
        "Authorization":             `Bearer ${token}`,
        "X-Target-Environment":      ENV(),
        "Ocp-Apim-Subscription-Key": subKey,
      },
    });
    if (!res.ok) return Response.json({ error: `Status lookup failed (${res.status}): ${await res.text()}` }, { status: 502 });
    return Response.json(await res.json());
  }

  // ── Phone / account validation ───────────────────────────────────────────────
  if (action === "validate_phone") {
    if (!phone) return Response.json({ error: "phone is required for action=validate_phone" }, { status: 400 });
    if (!/^\d{10,15}$/.test(phone)) return Response.json({ error: "Phone must be E.164 digits only, e.g. 233244000001" }, { status: 400 });

    const { token, subKey } = await getToken(product);
    const res = await fetch(
      `${BASE_URL()}/${product}/v1_0/accountholder/msisdn/${phone}/active`,
      {
        headers: {
          "Authorization":             `Bearer ${token}`,
          "X-Target-Environment":      ENV(),
          "Ocp-Apim-Subscription-Key": subKey,
        },
      }
    );
    if (!res.ok) return Response.json({ error: `Validation failed (${res.status}): ${await res.text()}` }, { status: 502 });
    const data = await res.json();
    return Response.json({ phone, active: data.result === true });
  }

  return Response.json(
    { error: "Unknown action. Valid actions: balance | status | validate_phone" },
    { status: 400 }
  );
});