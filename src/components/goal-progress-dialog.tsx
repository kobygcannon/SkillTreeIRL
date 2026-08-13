"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { GoalItem } from "@/app/page";

export default function GoalProgressDialog({
  goal,
  close,
  onSaved,
}: {
  goal: GoalItem;
  close: () => void;
  onSaved: (value: number) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (form: FormData) => {
    setSaving(true);
    setError("");
    const value = Number(form.get("value"));
    const response = await fetch(`/api/v1/goals/${goal.id}/progress`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify({ value, note: form.get("note") || null }),
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error?.message || "Progress was not saved.");
      setSaving(false);
      return;
    }
    onSaved(value);
    close();
  };
  return (
    <div
      className="modal-wrap"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <div
        className="quick-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Add goal progress"
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">GOAL PROGRESS</span>
            <h2>{goal.title}</h2>
          </div>
          <button
            className="icon-btn"
            onClick={close}
            aria-label="Close progress dialog"
          >
            <X />
          </button>
        </div>
        <form className="real-form" action={submit}>
          <label>
            New total ({goal.unit})
            <input
              name="value"
              type="number"
              min="0"
              max={goal.target}
              step="any"
              defaultValue={goal.current}
              required
            />
          </label>
          <label>
            What changed?
            <textarea name="note" maxLength={1000} />
          </label>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <div className="form-actions">
            <button type="button" className="outline" onClick={close}>
              Cancel
            </button>
            <button className="primary" disabled={saving}>
              {saving ? (
                "Saving…"
              ) : (
                <>
                  <Check /> Save progress
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
