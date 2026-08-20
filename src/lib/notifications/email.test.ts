import { afterEach, describe, expect, it, vi } from "vitest";
import {
  emailNotificationsReady,
  sendReminderEmails,
  sendTransactionalEmails,
} from "./email";

const original = {
  key: process.env.RESEND_API_KEY,
  from: process.env.NOTIFICATION_FROM_EMAIL,
  url: process.env.NEXT_PUBLIC_APP_URL,
};
afterEach(() => {
  vi.unstubAllGlobals();
  for (const [name, value] of Object.entries({
    RESEND_API_KEY: original.key,
    NOTIFICATION_FROM_EMAIL: original.from,
    NEXT_PUBLIC_APP_URL: original.url,
  }))
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
});
describe("email notifications", () => {
  it("fails closed without server credentials", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.NOTIFICATION_FROM_EMAIL;
    expect(emailNotificationsReady()).toBe(false);
    await expect(
      sendReminderEmails(
        [
          {
            to: "person@example.test",
            title: "Practice",
            body: "habit reminder",
          },
        ],
        "reminder/test",
      ),
    ).rejects.toThrow(/not configured/);
  });
  it("sends a safe idempotent batch", async () => {
    process.env.RESEND_API_KEY = "restricted-key";
    process.env.NOTIFICATION_FROM_EMAIL =
      "SkillTree IRL <reminders@example.test>";
    process.env.NEXT_PUBLIC_APP_URL = "https://skilltree.example";
    const request = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: "email_1" }] }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", request);
    await sendReminderEmails(
      [
        {
          to: "person@example.test",
          title: "Practice",
          body: "habit reminder",
        },
      ],
      "reminders/batch-1",
    );
    expect(request).toHaveBeenCalledWith(
      "https://api.resend.com/emails/batch",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "idempotency-key": "reminders/batch-1",
        }),
      }),
    );
    const body = JSON.parse(request.mock.calls[0][1].body);
    expect(body[0]).toMatchObject({
      to: ["person@example.test"],
      subject: "Practice",
    });
    expect(body[0].text).toContain("https://skilltree.example");
  });
  it("uses a specific action link for transactional mail", async () => {
    process.env.RESEND_API_KEY = "restricted-key";
    process.env.NOTIFICATION_FROM_EMAIL = "SkillTree IRL <team@example.test>";
    const request = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", request);
    await sendTransactionalEmails(
      [
        {
          to: "invitee@example.test",
          title: "Join Example Studio",
          body: "You have been invited.",
          actionLabel: "Accept invitation",
          actionUrl:
            "https://skilltree.example/workspace/join?token=safe-token",
        },
      ],
      "organization-invite/example",
    );
    const body = JSON.parse(request.mock.calls[0][1].body);
    expect(body[0].text).toContain(
      "Accept invitation: https://skilltree.example/workspace/join?token=safe-token",
    );
  });
});
