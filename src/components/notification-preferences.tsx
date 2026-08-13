"use client";
import { useEffect, useState } from "react";

type Preferences = {
  in_app: boolean;
  email: boolean;
  web_push: boolean;
  reminders: boolean;
  achievements: boolean;
  social: boolean;
  quiet_hours: { start?: string; end?: string };
};
const defaults: Preferences = {
  in_app: true,
  email: false,
  web_push: false,
  reminders: true,
  achievements: true,
  social: true,
  quiet_hours: {},
};

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState(defaults),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/v1/notifications/preferences")
      .then((response) => response.json())
      .then((body) => {
        if (body.data) setPreferences(body.data);
        setLoading(false);
      })
      .catch(() => {
        setMessage("Notification preferences could not be loaded.");
        setLoading(false);
      });
  }, []);
  const save = async () => {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/v1/notifications/preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(preferences),
      }),
      body = await response.json().catch(() => ({}));
    setSaving(false);
    setMessage(
      response.ok
        ? "Notification preferences saved."
        : body.error?.message || "Preferences could not be saved.",
    );
  };
  const toggle = (
    key: keyof Pick<
      Preferences,
      "in_app" | "email" | "reminders" | "achievements" | "social"
    >,
  ) => setPreferences((current) => ({ ...current, [key]: !current[key] }));
  if (loading) return <p>Loading notification preferences…</p>;
  return (
    <div className="real-form">
      <h2>Channels and topics</h2>
      <label>
        <input
          type="checkbox"
          checked={preferences.in_app}
          onChange={() => toggle("in_app")}
        />{" "}
        In-app notifications
      </label>
      <label>
        <input
          type="checkbox"
          checked={preferences.email}
          onChange={() => toggle("email")}
        />{" "}
        Email reminders
      </label>
      <label>
        <input
          type="checkbox"
          checked={preferences.reminders}
          onChange={() => toggle("reminders")}
        />{" "}
        Scheduled reminders
      </label>
      <label>
        <input
          type="checkbox"
          checked={preferences.achievements}
          onChange={() => toggle("achievements")}
        />{" "}
        Achievement updates
      </label>
      <label>
        <input
          type="checkbox"
          checked={preferences.social}
          onChange={() => toggle("social")}
        />{" "}
        Friend and challenge updates
      </label>
      <h3>Quiet hours</h3>
      <p>No reminders are delivered during this local-time window.</p>
      <div className="form-row">
        <label>
          Starts
          <input
            type="time"
            value={preferences.quiet_hours.start || ""}
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                quiet_hours: {
                  ...current.quiet_hours,
                  start: event.target.value,
                },
              }))
            }
          />
        </label>
        <label>
          Ends
          <input
            type="time"
            value={preferences.quiet_hours.end || ""}
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                quiet_hours: {
                  ...current.quiet_hours,
                  end: event.target.value,
                },
              }))
            }
          />
        </label>
      </div>
      <div className="form-actions">
        <button
          className="outline"
          type="button"
          onClick={() =>
            setPreferences((current) => ({ ...current, quiet_hours: {} }))
          }
        >
          Clear quiet hours
        </button>
        <button
          className="primary"
          type="button"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
