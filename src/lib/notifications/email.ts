export type TransactionalEmail = {
  to: string;
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
};

export function emailNotificationsReady() {
  return Boolean(
    process.env.RESEND_API_KEY && process.env.NOTIFICATION_FROM_EMAIL,
  );
}

export async function sendTransactionalEmails(
  messages: TransactionalEmail[],
  idempotencyKey: string,
) {
  if (!messages.length) return;
  const apiKey = process.env.RESEND_API_KEY,
    from = process.env.NOTIFICATION_FROM_EMAIL,
    appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!apiKey || !from)
    throw new Error("Email notifications are not configured");
  if (messages.length > 100)
    throw new Error("Email notification batch exceeds 100 messages");
  const response = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "idempotency-key": idempotencyKey,
      "user-agent": "SkillTree-IRL/1.0",
    },
    body: JSON.stringify(
      messages.map((message) => ({
        from,
        to: [message.to],
        subject: message.title,
        text: `${message.body}\n\n${message.actionLabel || "Open SkillTree IRL"}: ${message.actionUrl || appUrl || "https://skill-tree-irl.vercel.app/app"}`,
      })),
    ),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Email provider returned ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }
}

export async function sendReminderEmails(
  messages: TransactionalEmail[],
  idempotencyKey: string,
) {
  return sendTransactionalEmails(messages, idempotencyKey);
}
