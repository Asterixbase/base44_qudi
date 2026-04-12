/**
 * dailyReminderJob — Scheduled background job
 *
 * Runs every day at 8am (UTC). For each active circle:
 *   1. Finds members with payment_status = "pending" or "overdue"
 *   2. Checks how close the next due date is (1 day, 3 days, 7 days, overdue)
 *   3. Sends an SMS reminder via sendSMSReminder function
 *   4. Stores every attempt as a Notification record
 *   5. Produces a daily delivery report (logged + stored as Notification)
 *
 * Due date logic:
 *   - weekly circles:  due every 7 days from circle created_date
 *   - monthly circles: due on the same day each month as created_date
 *
 * This job is invoked by the Base44 scheduled automation.
 * It can also be called manually by an admin via the SDK.
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

function getNextDueDate(circle) {
  const created = new Date(circle.created_date || Date.now());
  const now = new Date();
  const cycle = circle.current_cycle || 1;

  if (circle.frequency === "weekly") {
    const due = new Date(created);
    due.setDate(created.getDate() + cycle * 7);
    if (due < now) due.setDate(due.getDate() + 7);
    return due;
  }

  // monthly
  const due = new Date(created);
  due.setMonth(created.getMonth() + cycle);
  if (due < now) due.setMonth(due.getMonth() + 1);
  return due;
}

function daysUntil(date) {
  const now = new Date();
  return Math.round((date - now) / (1000 * 60 * 60 * 24));
}

function buildMessage(member, circle, daysLeft) {
  const amount = `GHS ${circle.contribution_amount || 200}`;
  if (daysLeft < 0) {
    return `Hi ${member.full_name}, your ${amount} Qudi contribution for "${circle.name}" (Cycle ${circle.current_cycle || 1}) is OVERDUE by ${Math.abs(daysLeft)} day(s). Please pay now to avoid penalties. - Qudi`;
  }
  if (daysLeft === 0) {
    return `Hi ${member.full_name}, your ${amount} Qudi contribution for "${circle.name}" is DUE TODAY. Please pay now. - Qudi`;
  }
  if (daysLeft === 1) {
    return `Hi ${member.full_name}, reminder: your ${amount} Qudi contribution for "${circle.name}" is due TOMORROW. - Qudi`;
  }
  return `Hi ${member.full_name}, your ${amount} Qudi contribution for "${circle.name}" (Cycle ${circle.current_cycle || 1}) is due in ${daysLeft} days. - Qudi`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Support both scheduled (no auth header) and manual admin invocation
  let isAdmin = false;
  try {
    const user = await base44.auth.me();
    isAdmin = user?.role === "admin";
  } catch {
    // Scheduled automation — no user session, use service role throughout
  }

  // Fetch all active circles
  const circles = await base44.asServiceRole.entities.Circle.filter({ status: "active" });
  if (circles.length === 0) {
    return Response.json({ message: "No active circles found.", reminders: 0 });
  }

  const report = {
    date:       new Date().toISOString().split("T")[0],
    circlesScanned: circles.length,
    remindersSent:  0,
    remindersSkipped: 0,
    failures:       0,
    details:        [],
  };

  for (const circle of circles) {
    const members = await base44.asServiceRole.entities.Member.filter({ circle_id: circle.id });
    const dueDate = getNextDueDate(circle);
    const daysLeft = daysUntil(dueDate);

    // Only remind at: overdue, due today, 1 day away, 3 days away, 7 days away
    const shouldRemind = daysLeft <= 0 || daysLeft === 1 || daysLeft === 3 || daysLeft === 7;

    for (const member of members) {
      if (member.payment_status === "paid" || member.has_received_payout) {
        report.remindersSkipped++;
        continue;
      }
      if (!shouldRemind) {
        report.remindersSkipped++;
        continue;
      }

      const message = buildMessage(member, circle, daysLeft);
      let notifStatus = "sent";
      let notifNote = "";

      try {
        const res = await base44.asServiceRole.functions.invoke("sendSMSReminder", {
          to:      member.phone,
          message,
          provider: "arkesel",
        });

        if (!res?.success) {
          notifStatus = "failed";
          notifNote   = res?.error || "SMS function returned failure";
          report.failures++;
        } else {
          report.remindersSent++;
          notifNote = res?.simulated ? "[SIMULATED] " : "";
          notifNote += `Due in ${daysLeft} day(s). MsgId: ${res?.messageId || "N/A"}`;
        }
      } catch (e) {
        notifStatus = "failed";
        notifNote   = e.message;
        report.failures++;
      }

      // Store Notification record
      await base44.asServiceRole.entities.Notification.create({
        circle_id:   circle.id,
        member_id:   member.id,
        member_name: member.full_name,
        phone:       member.phone,
        message,
        status:  notifStatus,
        channel: "sms",
      });

      report.details.push({
        circle:     circle.name,
        member:     member.full_name,
        phone:      member.phone,
        daysLeft,
        status:     notifStatus,
        note:       notifNote,
      });
    }
  }

  // Store daily delivery report as a special Notification record
  const reportSummary =
    `Daily SMS Report ${report.date}: ${report.circlesScanned} circles scanned, ` +
    `${report.remindersSent} sent, ${report.remindersSkipped} skipped, ${report.failures} failed.`;

  await base44.asServiceRole.entities.Notification.create({
    circle_id:   "system",
    member_id:   "system",
    member_name: "System Report",
    phone:       "N/A",
    message:     reportSummary,
    status:      report.failures > 0 ? "failed" : "sent",
    channel:     "in-app",
  });

  console.log("[dailyReminderJob]", reportSummary);

  return Response.json(report);
});