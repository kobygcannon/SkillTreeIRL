"use client";

import { useMemo, useState } from "react";
import { ArrowUp, Check, Flag, Info, Plus, X } from "lucide-react";
import type { GoalItem } from "@/app/page";

type EntryMode = "add" | "total";
const derivedMeasurements = new Set(["milestones", "composite"]);

function progressLanguage(goal: GoalItem) {
  const unit = goal.unit || "units";
  switch (goal.measurement) {
    case "currency": return { add: "Amount to add (" + unit + ")", total: "New saved total (" + unit + ")", example: "50" };
    case "percentage": return { add: "Percentage points to add", total: "New total (%)", example: "5" };
    case "duration": return { add: "Time to add (" + unit + ")", total: "New total (" + unit + ")", example: "30" };
    case "frequency":
    case "recurring": return { add: unit + " completed", total: "New total (" + unit + ")", example: "1" };
    default: return { add: "Amount to add (" + unit + ")", total: "New total (" + unit + ")", example: "1" };
  }
}

export default function GoalProgressDialog({ goal, close, onSaved }: {
  goal: GoalItem;
  close: () => void;
  onSaved: (value: number) => void;
}) {
  const measurement = goal.measurement || "numeric";
  const isOpenEnded = measurement === "open_ended";
  const isBinary = measurement === "binary";
  const isDerived = derivedMeasurements.has(measurement);
  const [mode, setMode] = useState<EntryMode>("add");
  const [amount, setAmount] = useState(isOpenEnded || isBinary ? "1" : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const language = progressLanguage(goal);
  const numericAmount = Number(amount);
  const resultingTotal = mode === "add" ? goal.current + numericAmount : numericAmount;
  const preview = useMemo(() => !amount || !Number.isFinite(resultingTotal) ? null : resultingTotal, [amount, resultingTotal]);

  const submit = async (form: FormData) => {
    setSaving(true);
    setError("");
    const deltaMode = !isBinary && (isOpenEnded || mode === "add");
    const progressPayload = isBinary
      ? { value: goal.target || 1 }
      : deltaMode
        ? { delta: Number(amount) }
        : { value: Number(amount) };
    const response = await fetch("/api/v1/goals/" + goal.id + "/progress", {
      method: "POST",
      headers: {"content-type": "application/json", "idempotency-key": crypto.randomUUID()},
      body: JSON.stringify({ ...progressPayload, note: form.get("note") || null }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error?.message || "Progress was not saved.");
      setSaving(false);
      return;
    }
    onSaved(Number(body.data.value));
    close();
  };

  return (
    <div className="modal-wrap" onMouseDown={event => event.target === event.currentTarget && close()}>
      <div className="quick-modal progress-entry-modal" role="dialog" aria-modal="true" aria-label="Add goal progress">
        <div className="modal-head">
          <div><span className="eyebrow">UPDATE THIS GOAL</span><h2>{goal.title}</h2></div>
          <button className="icon-btn" onClick={close} aria-label="Close progress dialog"><X /></button>
        </div>
        {isDerived ? (
          <div className="progress-derived">
            <Info />
            <h3>{measurement === "milestones" ? "Complete a milestone instead" : "Update a linked subgoal instead"}</h3>
            <p>{measurement === "milestones" ? "This goal’s total is calculated from its milestones, so a direct number would make the record misleading." : "Composite progress is calculated from the goals inside it. Update one of those goals to move this total."}</p>
            <button className="outline" onClick={close}>Got it</button>
          </div>
        ) : (
          <form className="real-form progress-entry-form" action={submit}>
            {isBinary ? (
              <div className="progress-binary"><Flag /><div><b>Mark this outcome complete</b><p>This records the goal at 100%. You can correct the entry later from history.</p></div></div>
            ) : !isOpenEnded && (
              <div className="progress-mode" aria-label="Progress entry type">
                <button type="button" className={mode === "add" ? "active" : ""} onClick={() => setMode("add")}><Plus /> Add to progress</button>
                <button type="button" className={mode === "total" ? "active" : ""} onClick={() => setMode("total")}><ArrowUp /> Set new total</button>
              </div>
            )}
            {!isBinary && !isOpenEnded && <label>
              {mode === "add" ? language.add : language.total}
              <input name="amount" type="number" min={mode === "add" ? "0.000001" : "0"} max={measurement === "percentage" ? (mode === "add" ? 100 - goal.current : 100) : undefined} step="any" placeholder={language.example} value={amount} onChange={event => setAmount(event.target.value)} required autoFocus />
            </label>}
            {preview !== null && !isBinary && !isOpenEnded && (
              <div className="progress-preview"><span>After this update</span><b>{resultingTotal.toLocaleString()} {goal.unit}</b>{goal.target > 0 && <small>of {goal.target.toLocaleString()} {goal.unit}</small>}</div>
            )}
            <label>
              {isOpenEnded ? "What did you move forward?" : "Add a note (optional)"}
              <textarea name="note" maxLength={1000} required={isOpenEnded} placeholder={isOpenEnded ? "e.g. Finished the first draft and noted what to revise next" : "What changed, or what helped?"} />
            </label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <div className="form-actions">
              <button type="button" className="outline" onClick={close}>Cancel</button>
              <button className="primary" disabled={saving || (!isBinary && !isOpenEnded && (!amount || numericAmount < 0))}>
                {saving ? "Saving…" : <><Check /> {isOpenEnded ? "Log update" : isBinary ? "Mark complete" : "Save progress"}</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
