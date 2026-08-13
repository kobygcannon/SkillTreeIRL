import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { failure } from "@/domains/shared/http";
import { reportProductionError } from "@/lib/monitoring";
import { isValidTimeZone } from "@/lib/i18n";
import { sendReminderEmails } from "@/lib/notifications/email";
import { monitorScheduledJob } from "@/lib/monitoring/scheduled-job";

type QuietHours = { start?: string; end?: string };
function quietNow(quiet: QuietHours, timezone: string, now: Date) {
  if (!quiet.start || !quiet.end) return false;
  const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: isValidTimeZone(timezone) ? timezone : "UTC",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now),
    time = `${parts.find((part) => part.type === "hour")?.value}:${parts.find((part) => part.type === "minute")?.value}`;
  return quiet.start <= quiet.end
    ? time >= quiet.start && time < quiet.end
    : time >= quiet.start || time < quiet.end;
}

async function run(request: Request) {
  try {
    const expected = process.env.CRON_SECRET;
    if (
      !expected ||
      request.headers.get("authorization") !== `Bearer ${expected}`
    )
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid job credential" } },
        { status: 401 },
      );
    const admin = createAdminClient();
    if (!admin)
      return NextResponse.json(
        {
          error: {
            code: "NOT_CONFIGURED",
            message: "Service role is unavailable",
          },
        },
        { status: 503 },
      );
    const now = new Date(),
      overdueResult = await admin
        .from("quests")
        .update({ status: "overdue", updated_at: now.toISOString() })
        .eq("status", "ready")
        .lt("due_at", now.toISOString())
        .select("id"),
      { data: due, error } = await admin
        .from("reminders")
        .select("id,user_id,title,reminder_type,next_run_at,schedule")
        .eq("enabled", true)
        .lte("next_run_at", now.toISOString())
        .limit(100);
    if (overdueResult.error) return failure(overdueResult.error);
    if (error) return failure(error);
    if (!due?.length)
      return NextResponse.json({
        data: {
          processed: 0,
          delivered: 0,
          deferred: 0,
          questsMarkedOverdue: overdueResult.data?.length || 0,
        },
      });
    const userIds = [...new Set(due.map((item) => item.user_id))],
      [preferences, profiles, subscriptions] = await Promise.all([
        admin
          .from("notification_preferences")
          .select("user_id,in_app,email,web_push,reminders,quiet_hours")
          .in("user_id", userIds),
        admin.from("profiles").select("id,timezone").in("id", userIds),
        admin
          .from("push_subscriptions")
          .select("id,user_id,endpoint,p256dh,auth_key")
          .in("user_id", userIds),
      ]);
    if (preferences.error || profiles.error || subscriptions.error)
      return failure(
        preferences.error || profiles.error || subscriptions.error,
      );
    const preferenceMap = new Map(
        (preferences.data || []).map((item) => [item.user_id, item]),
      ),
      timezoneMap = new Map(
        (profiles.data || []).map((item) => [item.id, item.timezone || "UTC"]),
      );
    const vapidReady = Boolean(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
    );
    if (vapidReady)
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT!,
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!,
      );
    const emailCandidates = due.filter((reminder) => {
      const preference = preferenceMap.get(reminder.user_id);
      return (
        preference?.email === true &&
        preference.reminders !== false &&
        !quietNow(
          (preference.quiet_hours || {}) as QuietHours,
          timezoneMap.get(reminder.user_id) || "UTC",
          now,
        )
      );
    });
    const recipientMap = new Map<string, string>();
    await Promise.all(
      [...new Set(emailCandidates.map((item) => item.user_id))].map(
        async (userId) => {
          const { data, error } = await admin.auth.admin.getUserById(userId);
          if (!error && data.user.email)
            recipientMap.set(userId, data.user.email);
        },
      ),
    );
    const emailBlocked = new Set<string>();
    const sendableEmailCandidates = emailCandidates.filter((reminder) => {
      const recipient = recipientMap.get(reminder.user_id);
      if (!recipient) {
        emailBlocked.add(reminder.id);
        return false;
      }
      return true;
    });
    const emailMessages = sendableEmailCandidates.map((reminder) => ({
      to: recipientMap.get(reminder.user_id)!,
      title: reminder.title,
      body: `${reminder.reminder_type} reminder`,
    }));
    if (emailBlocked.size)
      await reportProductionError({
        message: "Email reminder recipient is unavailable",
        source: "provider",
        route: "reminder-worker",
        context: { provider: "email", reminders: emailBlocked.size },
      });
    if (emailMessages.length) {
      const batchIdentity = sendableEmailCandidates
        .map((item) => `${item.id}:${item.next_run_at || "due"}`)
        .sort()
        .join("|");
      try {
        await sendReminderEmails(
          emailMessages,
          `reminders/${createHash("sha256").update(batchIdentity).digest("hex").slice(0, 32)}`,
        );
      } catch (error) {
        sendableEmailCandidates.forEach((item) => emailBlocked.add(item.id));
        await reportProductionError({
          message:
            error instanceof Error ? error.message : "Email delivery failed",
          stack: error instanceof Error ? error.stack : undefined,
          source: "provider",
          route: "reminder-worker",
          context: { provider: "email", reminders: emailCandidates.length },
        });
      }
    }
    let delivered = 0,
      deferred = 0;
    const failed = emailBlocked.size;
    for (const reminder of due) {
      const preference = preferenceMap.get(reminder.user_id),
        quiet = (preference?.quiet_hours || {}) as QuietHours;
      if (preference?.reminders === false) {
        await admin
          .from("reminders")
          .update({ enabled: false, updated_at: now.toISOString() })
          .eq("id", reminder.id);
        continue;
      }
      if (quietNow(quiet, timezoneMap.get(reminder.user_id) || "UTC", now)) {
        await admin
          .from("reminders")
          .update({
            next_run_at: new Date(now.getTime() + 30 * 60000).toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("id", reminder.id);
        deferred++;
        continue;
      }
      if (emailBlocked.has(reminder.id)) continue;
      if (preference?.in_app !== false) {
        const { error: notificationError } = await admin
          .from("notifications")
          .insert({
            user_id: reminder.user_id,
            type: "reminder",
            title: reminder.title,
            body: `${reminder.reminder_type} reminder`,
          });
        if (notificationError) continue;
      }
      if (vapidReady && preference?.web_push) {
        for (const subscription of (subscriptions.data || []).filter(
          (item) => item.user_id === reminder.user_id,
        )) {
          try {
            await webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: {
                  p256dh: subscription.p256dh,
                  auth: subscription.auth_key,
                },
              },
              JSON.stringify({
                title: reminder.title,
                body: `${reminder.reminder_type} reminder`,
                url: "/app",
                tag: `reminder-${reminder.id}`,
              }),
            );
          } catch (error) {
            const status = (error as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410)
              await admin
                .from("push_subscriptions")
                .delete()
                .eq("id", subscription.id);
            else
              await reportProductionError({
                message:
                  error instanceof Error
                    ? error.message
                    : "Push delivery failed",
                stack: error instanceof Error ? error.stack : undefined,
                source: "provider",
                route: "reminder-worker",
                context: {
                  provider: "web-push",
                  status: status || null,
                  reminderId: reminder.id,
                },
              });
          }
        }
      }
      const schedule = reminder.schedule as {
          kind?: string;
          intervalDays?: number;
        },
        next =
          schedule?.kind === "recurring"
            ? new Date(
                now.getTime() +
                  Math.max(1, Number(schedule.intervalDays || 1)) * 864e5,
              ).toISOString()
            : null;
      await admin
        .from("reminders")
        .update({
          last_sent_at: now.toISOString(),
          next_run_at: next,
          enabled: Boolean(next),
          updated_at: now.toISOString(),
        })
        .eq("id", reminder.id);
      delivered++;
    }
    return NextResponse.json({
      data: {
        processed: due.length,
        delivered,
        deferred,
        failed,
        questsMarkedOverdue: overdueResult.data?.length || 0,
      },
    });
  } catch (error) {
    return failure(error);
  }
}
export function POST(request: Request) {
  return monitorScheduledJob("skilltree-reminders", "0 6 * * *", () =>
    run(request),
  );
}
export const GET = POST;
