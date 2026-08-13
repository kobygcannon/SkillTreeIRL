import Link from "next/link";
import PushNotifications from "@/components/push-notifications";
import NotificationPreferences from "@/components/notification-preferences";
export default function NotificationSettings() {
  return (
    <main className="onboard">
      <header>
        <Link href="/app" className="onboard-logo">
          SkillTree IRL
        </Link>
        <Link href="/app">Back to app</Link>
      </header>
      <section>
        <div className="onboard-card narrow">
          <p className="kicker">NOTIFICATIONS</p>
          <h1>Reminders you control</h1>
          <p>
            Enable browser notifications on this device. In-app reminders
            continue to work independently, and quiet hours remain respected by
            scheduled delivery.
          </p>
          <div className="card side-card">
            <NotificationPreferences />
          </div>
          <div className="card side-card">
            <h2>Browser notifications</h2>
            <PushNotifications />
          </div>
          <p>
            SkillTree uses supportive language and never treats inactivity as
            failure.
          </p>
        </div>
      </section>
    </main>
  );
}
