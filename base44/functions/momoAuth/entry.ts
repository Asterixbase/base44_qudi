/**
 * MTN MoMo shared auth helper.
 * Returns a Bearer access token for the given MoMo product (collection | disbursement).
 *
 * Required env vars (set in Dashboard → Settings → Environment Variables):
 *   MTN_MOMO_BASE_URL                         e.g. https://sandbox.momodeveloper.mtn.com
 *   MTN_MOMO_ENVIRONMENT                      e.g. sandbox | mtnghana | mtncongo
 *   MTN_MOMO_COLLECTION_API_USER              UUID
 *   MTN_MOMO_COLLECTION_API_KEY
 *   MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY
 *   MTN_MOMO_DISBURSEMENT_API_USER            UUID
 *   MTN_MOMO_DISBURSEMENT_API_KEY
 *   MTN_MOMO_DISBURSEMENT_SUBSCRIPTION_KEY
 */

export async function getMoMoToken(product) {
  const BASE_URL = Deno.env.get("MTN_MOMO_BASE_URL");

  const apiUser = product === "collection"
    ? Deno.env.get("MTN_MOMO_COLLECTION_API_USER")
    : Deno.env.get("MTN_MOMO_DISBURSEMENT_API_USER");

  const apiKey = product === "collection"
    ? Deno.env.get("MTN_MOMO_COLLECTION_API_KEY")
    : Deno.env.get("MTN_MOMO_DISBURSEMENT_API_KEY");

  const subscriptionKey = product === "collection"
    ? Deno.env.get("MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY")
    : Deno.env.get("MTN_MOMO_DISBURSEMENT_SUBSCRIPTION_KEY");

  if (!BASE_URL || !apiUser || !apiKey || !subscriptionKey) {
    throw new Error(`Missing MTN MoMo env vars for product: ${product}`);
  }

  const credentials = btoa(`${apiUser}:${apiKey}`);
  const endpoint = product === "collection"
    ? `${BASE_URL}/collection/token/`
    : `${BASE_URL}/disbursement/token/`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Ocp-Apim-Subscription-Key": subscriptionKey,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MoMo token request failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}