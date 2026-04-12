/**
 * autoPayoutJob — Automated Cycle Payout Trigger
 *
 * Runs on a schedule (every hour) and after every Member payment update.
 * For each active circle, checks whether the cycle collection target has been
 * reached (all members paid for this cycle). If so, it:
 *   1. Identifies the next payout recipient based on circle.payout_order
 *   2. Calls sendPayoutMoMo to disburse via MTN MoMo
 *   3. Marks the recipient as has_received_payout = true
 *   4. Advances circle.current_cycle
 *   5. Resets all member payment_status to 'pending' for the next cycle
 *   6. Sends in-app + SMS notification to the recipient
 *   7. Marks the circle as 'completed' when all members have received payouts
 *
 * Can also be invoked manually by an admin:
 *   base44.functions.invoke('autoPayoutJob', { circleId: 'xxx' })
 *   — pass circleId to limit the check to a single circle.
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

/* ── helpers ── */

function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getNextRecipient(circle, members) {
  const eligible = members.filter((m) => !m.has_received_payout);
  if (eligible.length === 0) return null;

  switch (circle.payout_order) {
    case "random":
      // Use cycle number as entropy so order is deterministic per cycle
      return seededShuffle(eligible, (circle.id || "seed") + (circle.current_cycle || 1))[0];

    case "bid":
    case "rotation":
    case "fixed":
    default:
      return eligible.sort((a, b) => (a.payout_position || 0) - (b.payout_position || 0))[0];
  }
}

function cycleTargetReached(circle, members) {
  const totalMembers = circle.max_members || members.length;
  const paidCount = members.filter((m) => m.payment_status === "paid").length;
  return paidCount >= totalMembers;
}

/* ── main handler ── */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow both scheduled (no session) and manual admin calls
  try {
    const user = await base44.auth.me();
    if (user && user.role !== "admin") {
      return Response.json({ error: "Forbidden: admin only" }, { status: 403 });
    }
  } catch {
    // Scheduled invocation — no session, proceed as service role
  }

  let body = {};
  try { body = await req.json(); } catch { /* no body — scheduled run */ }

  const { circleId } = body;

  // Fetch circles to process
  const circles = circleId
    ? await base44.asServiceRole.entities.Circle.filter({ id: circleId, status: "active" })
    : await base44.asServiceRole.entities.Circle.filter({ status: "active" });

  if (circles.length === 0) {
    return Response.json({ message: "No active circles to process.", processed: 0 });
  }

  const report = {
    date: new Date().toISOString(),
    circlesChecked: circles.length,
    payoutsTriggered: 0,
    payoutsSkipped: 0,
    errors: [],
  };

  for (const circle of circles) {
    try {
      const members = await base44.asServiceRole.entities.Member.filter({ circle_id: circle.id });
      if (members.length === 0) { report.payoutsSkipped++; continue; }

      // Check if cycle target reached
      if (!cycleTargetReached(circle, members)) {
        report.payoutsSkipped++;
        continue;
      }

      // Find next recipient
      const recipient = getNextRecipient(circle, members);
      if (!recipient) {
        // All members have been paid — mark circle complete if not already
        if (circle.status !== "completed") {
          await base44.asServiceRole.entities.Circle.update(circle.id, { status: "completed" });
        }
        report.payoutsSkipped++;
        continue;
      }

      const payoutAmount = (circle.contribution_amount || 0) * members.length;

      // Trigger MoMo disbursement via sendPayoutMoMo
      let momoResult = null;
      try {
        momoResult = await base44.asServiceRole.functions.invoke("sendPayoutMoMo", {
          circleId:  circle.id,
          cycleName: `Cycle ${circle.current_cycle || 1}`,
          member: {
            id:            recipient.id,
            full_name:     recipient.full_name,
            phone:         recipient.phone,
            payout_amount: payoutAmount,
          },
        });
      } catch (momoErr) {
        report.errors.push({ circle: circle.name, error: "MoMo call failed: " + momoErr.message });
        // Still proceed to update DB — MoMo is simulated, don't block the flow
      }

      const momoRef = momoResult?.momoRef || null;
      const momoStatus = momoResult?.status || "PENDING";

      // Update recipient: has_received_payout, reset payment_status
      await base44.asServiceRole.entities.Member.update(recipient.id, {
        has_received_payout: true,
        payment_status:      "paid",
      });

      // Reset all other members to 'pending' for next cycle
      const resetPromises = members
        .filter((m) => m.id !== recipient.id)
        .map((m) =>
          base44.asServiceRole.entities.Member.update(m.id, { payment_status: "pending" })
        );
      await Promise.all(resetPromises);

      // Advance circle cycle
      const nextCycle = (circle.current_cycle || 1) + 1;
      const remainingUnpaid = members.filter(
        (m) => !m.has_received_payout && m.id !== recipient.id
      ).length;
      const isComplete = remainingUnpaid === 0;

      await base44.asServiceRole.entities.Circle.update(circle.id, {
        current_cycle: nextCycle,
        pot_balance:   Math.max(0, (circle.pot_balance || 0) - payoutAmount),
        ...(isComplete ? { status: "completed" } : {}),
      });

      // In-app notification to recipient
      const inAppMsg = `🎉 Auto-Payout! GHS ${payoutAmount.toLocaleString()} from "${circle.name}" (Cycle ${circle.current_cycle || 1}) has been sent to your MoMo (${recipient.phone || "registered number"}).${momoRef ? ` Ref: ${momoRef}` : ""} — Qudi`;
      await base44.asServiceRole.entities.Notification.create({
        circle_id:   circle.id,
        member_id:   recipient.id,
        member_name: recipient.full_name,
        phone:       recipient.phone || "N/A",
        message:     inAppMsg,
        status:      "sent",
        channel:     "in-app",
      });

      // SMS notification (best-effort)
      if (recipient.phone) {
        try {
          await base44.asServiceRole.functions.invoke("sendSMSReminder", {
            to:      recipient.phone,
            message: `Qudi: GHS ${payoutAmount.toLocaleString()} auto-payout for "${circle.name}" Cycle ${circle.current_cycle || 1} sent to your MoMo.${momoRef ? ` Ref: ${momoRef}.` : ""}`,
          });
        } catch {
          // Non-blocking
        }
      }

      // Record auto-payout in Notification log for audit
      await base44.asServiceRole.entities.Notification.create({
        circle_id:   circle.id,
        member_id:   "system",
        member_name: "Auto-Payout System",
        phone:       "N/A",
        message:     `Auto-payout triggered: GHS ${payoutAmount} → ${recipient.full_name} (${recipient.phone}). MoMo status: ${momoStatus}. ${isComplete ? "Circle completed." : `Cycle advanced to ${nextCycle}.`}`,
        status:      "sent",
        channel:     "in-app",
      });

      report.payoutsTriggered++;
      console.log(`[autoPayoutJob] Payout: ${circle.name} → ${recipient.full_name} GHS ${payoutAmount} (${momoStatus})`);

    } catch (err) {
      report.errors.push({ circle: circle.name, error: err.message });
      console.error(`[autoPayoutJob] Error for circle ${circle.name}:`, err.message);
    }
  }

  console.log(`[autoPayoutJob] Done — ${report.payoutsTriggered} payout(s) triggered, ${report.payoutsSkipped} skipped, ${report.errors.length} error(s).`);
  return Response.json(report);
});