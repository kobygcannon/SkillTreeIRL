"use client";

import { Check, Minus, SkipForward } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HabitOccurrenceManager({
  habitId,
  timezone,
}: {
  habitId: string;
  timezone: string;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const record = async (status: "complete" | "partial" | "skipped") => {
    setBusy(true);
    setMessage("");
    const localDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const response = await fetch(`/api/v1/habits/${habitId}/occurrences`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        localDate,
        status,
        detail: detail.trim() || null,
      }),
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(body.error?.message || "This habit entry could not be saved.");
      return;
    }
    setMessage(
      status === "complete"
        ? "Completed without changing your past progress."
        : status === "partial"
          ? "Partial progress recorded."
          : "Skipped without penalty.",
    );
    setDetail("");
    router.refresh();
  };

  return (
    <div className="card side-card">
      <h2>Record today</h2>
      <p>
        Complete, record partial progress, or skip without guilt. Every day
        remains a separate historical occurrence.
      </p>
      <label className="real-form">
        Optional details
        <textarea
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          maxLength={1000}
        />
      </label>
      <div className="form-actions">
        <button
          className="primary"
          disabled={busy}
          onClick={() => record("complete")}
        >
          <Check /> Complete
        </button>
        <button
          className="outline"
          disabled={busy}
          onClick={() => record("partial")}
        >
          <Minus /> Partial
        </button>
        <button
          className="outline"
          disabled={busy}
          onClick={() => record("skipped")}
        >
          <SkipForward /> Skip
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
