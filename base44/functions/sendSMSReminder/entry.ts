/**
 * sendSMSReminder — SMS dispatch via Arkesel (Ghana) or Twilio (international)
 * STATUS: PLACEHOLDER — logs messages locally until credentials are configured.
 *
 * POST payload:
 *   { to: string, message: string, provider?: "arkesel" | "twilio" }
 *
 * When ready for live, set env vars in Dashboard → Settings → Environment Variables:
 *   ARKESEL_API_KEY          — Arkesel SMS API key (Ghana)
 *   ARKESEL_SENDER_ID        — e.g. "Qudi"
 *   TWILIO_ACCOUNT_SID       — Twilio Account SID (international fallback)
 *   TWILIO_AUTH_TOKEN        — Twilio Auth Token
 *   TWILIO_FROM_NUMBER       — e.g. "+12015551234"
 *
 * Returns: { success, provider, to, messageId, simulated? }
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

async function sendArkesel(to, message) {
  const apiKey  = Deno.env.get("ARKESEL_API_KEY");
  const sender  = Deno.env.get("ARKESEL_SENDER_ID") || "Qudi";
  if (!apiKey) throw new Error("ARKESEL_API_KEY not set");

  const res = await fetch("https://sms.arkesel.com/sms/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action:      "send-sms",
      api_key:     apiKey,
      to,
      from:        sender,
      sms:         message,
    }),
  });

  if (!res.ok) throw new Error(`Arkesel error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  if (data.code !== "ok") throw new Error(`Arkesel rejected: ${data.message}`);
  return { provider: "arkesel", messageId: data["message-id"] || crypto.randomUUID() };
}

async function sendTwilio(to, message) {
  const sid   = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from  = Deno.env.get("TWILIO_FROM_NUMBER");
  if (!sid || !token || !from) throw new Error("Twilio env vars not set");

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`${sid}:${token}`)}`,
      "Content-Type":  "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: message }),
  });

  if (!res.ok) throw new Error(`Twilio error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return { provider: "twilio", messageId: data.sid };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { to, message, provider = "arkesel" } = body;
  if (!to || !message) {
    return Response.json({ error: "to and message are required" }, { status: 400 });
  }

  // Check if credentials are configured
  const arkeselReady = !!Deno.env.get("ARKESEL_API_KEY");
  const twilioReady  = !!(Deno.env.get("TWILIO_ACCOUNT_SID") && Deno.env.get("TWILIO_AUTH_TOKEN"));

  if (!arkeselReady && !twilioReady) {
    // SIMULATED — no credentials configured yet
    console.log(`[SMS SIMULATED] To: ${to} | Message: ${message}`);
    return Response.json({
      success:   true,
      simulated: true,
      note:      "Set ARKESEL_API_KEY or Twilio env vars to enable real SMS delivery.",
      provider:  "simulated",
      messageId: crypto.randomUUID(),
      to,
    });
  }

  try {
    let result;
    if (provider === "twilio" && twilioReady) {
      result = await sendTwilio(to, message);
    } else if (arkeselReady) {
      result = await sendArkesel(to, message);
    } else {
      result = await sendTwilio(to, message);
    }
    return Response.json({ success: true, to, ...result });
  } catch (e) {
    return Response.json({ success: false, error: e.message }, { status: 502 });
  }
});