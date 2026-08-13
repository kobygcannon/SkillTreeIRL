"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Plus,
  Swords,
  Target,
  X,
  Zap,
} from "lucide-react";
import { resilientFetch } from "@/lib/offline/queue";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import { cancelEvidenceUpload } from "@/lib/evidence/upload";

type Option = {
  id: string;
  name?: string;
  title?: string;
  current_value?: number;
  unit?: string;
  currency?: string;
};
type Mode =
  | "menu"
  | "activity"
  | "progress"
  | "complete"
  | "goal"
  | "skill"
  | "quest"
  | "habit"
  | "journal";

export default function AuthenticatedQuickAdd({
  close,
  onSuccess,
}: {
  close: () => void;
  onSuccess: (message: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("menu");
  const [skills, setSkills] = useState<Option[]>([]);
  const [goals, setGoals] = useState<Option[]>([]);
  const [quests, setQuests] = useState<Option[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [optionsLoading,setOptionsLoading]=useState(true);
  const [optionsFailed,setOptionsFailed]=useState(false);
  const loadOptions=()=>{setOptionsLoading(true);return Promise.all([
    fetch("/api/v1/skills").then((r) => {if(!r.ok)throw new Error();return r.json()}),
    fetch("/api/v1/goals?status=active,focus").then((r) => {if(!r.ok)throw new Error();return r.json()}),
    fetch("/api/v1/quests").then((r) => {if(!r.ok)throw new Error();return r.json()}),
  ]).then(([skillBody, goalBody, questBody]) => {
    setSkills(skillBody.data || []);
    setGoals(goalBody.data || []);
    setQuests((questBody.data || []).filter((quest: { status?: string }) => ["ready", "in_progress", "overdue"].includes(quest.status || "")));
    setOptionsFailed(false);
  }).catch(()=>setOptionsFailed(true)).finally(()=>setOptionsLoading(false))};
  useEffect(() => {
    Promise.all([
      fetch("/api/v1/skills").then((r) => {if(!r.ok)throw new Error();return r.json()}),
      fetch("/api/v1/goals?status=active,focus").then((r) => {if(!r.ok)throw new Error();return r.json()}),
      fetch("/api/v1/quests").then((r) => {if(!r.ok)throw new Error();return r.json()}),
    ]).then(([skillBody, goalBody, questBody]) => {
      setSkills(skillBody.data || []);
      setGoals(goalBody.data || []);
      setQuests(
        (questBody.data || []).filter((quest: { status?: string }) =>
          ["ready", "in_progress", "overdue"].includes(quest.status || ""),
        ),
      );
      setOptionsFailed(false);
    }).catch(()=>setOptionsFailed(true)).finally(()=>setOptionsLoading(false));
  }, []);

  const send = async (
    path: string,
    body: Record<string, unknown>,
    success: string,
    options?: { method?: string; idempotent?: boolean },
  ) => {
    setSaving(true);
    setError("");
    const transport = options?.idempotent ? resilientFetch : fetch,
      response = await transport(path, {
        method: options?.method || "POST",
        headers: {
          "content-type": "application/json",
          ...(options?.idempotent
            ? { "idempotency-key": crypto.randomUUID() }
            : {}),
        },
        body: JSON.stringify(body),
      });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error?.message || "Nothing was saved.");
      setSaving(false);
      return;
    }
    const pending = response.headers.get("x-skilltree-offline") === "queued";
    onSuccess(
      pending ? "Saved offline · progress and XP are pending sync." : success,
    );
    close();
    if (!pending) setTimeout(() => location.reload(), 500);
  };

  const attachEvidence = async (activityId: string, form: FormData) => {
    const file = form.get("evidenceFile"),
      url = String(form.get("evidenceUrl") || "").trim(),
      textNote = String(form.get("evidenceText") || "").trim();
    const attachments: Array<Record<string, unknown>> = [];
    let pendingFilePath = "";
    if (file instanceof File && file.size > 0) {
      if (!navigator.onLine)
        throw new Error(
          "File evidence needs a connection. The activity was saved without the file.",
        );
      const reservation = await globalThis.fetch("/api/v1/evidence/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mimeType: file.type, size: file.size }),
      });
      const reserved = await reservation.json().catch(() => ({}));
      if (!reservation.ok)
        throw new Error(
          reserved.error?.message ||
            "The activity was saved, but the evidence upload could not start.",
        );
      pendingFilePath = reserved.data.path;
      const storage = createBrowserSupabase();
      if (!storage) {
        await cancelEvidenceUpload(pendingFilePath);
        throw new Error(
          "The activity was saved, but evidence storage is not configured.",
        );
      }
      const { error: uploadError } = await storage.storage
        .from("evidence")
        .uploadToSignedUrl(reserved.data.path, reserved.data.token, file, {
          contentType: file.type,
        });
      if (uploadError) {
        await cancelEvidenceUpload(pendingFilePath);
        throw new Error(
          "The activity was saved, but the evidence file could not be uploaded.",
        );
      }
      attachments.push({
        type:
          file.type === "application/pdf"
            ? "document"
            : file.type === "text/plain"
              ? "text"
              : "image",
        storagePath: reserved.data.path,
      });
    }
    if (url) attachments.push({ type: "url", externalUrl: url });
    if (textNote) attachments.push({ type: "text", textNote });
    for (const attachment of attachments) {
      let response: Response;
      try {
        response = await globalThis.fetch(
          `/api/v1/activities/${activityId}/evidence`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(attachment),
          },
        );
      } catch (error) {
        if (attachment.storagePath) await cancelEvidenceUpload(pendingFilePath);
        throw error;
      }
      if (!response.ok) {
        if (attachment.storagePath) await cancelEvidenceUpload(pendingFilePath);
        throw new Error(
          "The activity was saved, but some evidence could not be attached. Open the activity from History to try again.",
        );
      }
      if (attachment.storagePath) pendingFilePath = "";
    }
  };
  const prepareQuestEvidence = async (form: FormData) => {
    const file = form.get("questEvidenceFile"),
      externalUrl = String(form.get("questEvidenceUrl") || "").trim(),
      textNote = String(form.get("questEvidenceText") || "").trim();
    if (file instanceof File && file.size) {
      if (!navigator.onLine)
        throw new Error("File evidence needs an internet connection.");
      const reservation = await globalThis.fetch("/api/v1/evidence/upload", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mimeType: file.type, size: file.size }),
        }),
        reserved = await reservation.json().catch(() => ({}));
      if (!reservation.ok)
        throw new Error(
          reserved.error?.message || "Evidence upload could not start.",
        );
      const storagePath = reserved.data.path as string;
      const storage = createBrowserSupabase();
      if (!storage) {
        await cancelEvidenceUpload(storagePath);
        throw new Error("Evidence storage is not configured.");
      }
      const { error } = await storage.storage
        .from("evidence")
        .uploadToSignedUrl(reserved.data.path, reserved.data.token, file, {
          contentType: file.type,
        });
      if (error) {
        await cancelEvidenceUpload(storagePath);
        throw new Error("Evidence could not be uploaded.");
      }
      return {
        evidenceType:
          file.type === "application/pdf"
            ? "document"
            : file.type === "text/plain"
              ? "text"
              : "image",
        storagePath,
      };
    }
    if (externalUrl) return { evidenceType: "url", externalUrl };
    if (textNote) return { evidenceType: "text", textNote };
    return {};
  };

  const submit = async (form: FormData) => {
    const goalId = String(form.get("goalId") || "") || undefined;
    const skillId = String(form.get("skillId") || "") || undefined;
    if (mode === "activity") {
      setSaving(true);
      setError("");
      const selectedSkills = form
          .getAll("skillIds")
          .map(String)
          .filter(Boolean),
        weight = selectedSkills.length ? 1 / selectedSkills.length : 0;
      const response = await resilientFetch("/api/v1/activities", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          description: form.get("description"),
          durationMinutes: form.get("duration")
            ? Number(form.get("duration"))
            : null,
          quantity: form.get("quantity") ? Number(form.get("quantity")) : null,
          unit: form.get("unit") || null,
          effort: form.get("effort"),
          occurredAt: form.get("occurredAt")
            ? new Date(String(form.get("occurredAt"))).toISOString()
            : new Date().toISOString(),
          goalIds: form.getAll("goalIds").map(String).filter(Boolean),
          skillAllocations: selectedSkills.map((skillId) => ({
            skillId,
            weight,
          })),
          privateNote: form.get("note") || null,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error?.message || "Nothing was saved.");
        setSaving(false);
        return;
      }
      if (response.headers.get("x-skilltree-offline") === "queued") {
        onSuccess(
          "Saved offline · progress and XP are pending sync. Add evidence after the activity syncs.",
        );
        close();
        return;
      }
      try {
        await attachEvidence(payload.data.activityId, form);
      } catch (error) {
        onSuccess(
          error instanceof Error
            ? error.message
            : "Activity saved without evidence.",
        );
        close();
        setTimeout(() => location.reload(), 900);
        return;
      }
      onSuccess("Activity logged. Progress, evidence and XP are confirmed.");
      close();
      setTimeout(() => location.reload(), 1500);
      return;
    }
    if (mode === "progress")
      return send(
        `/api/v1/goals/${goalId}/progress`,
        { value: Number(form.get("value")), note: form.get("note") || null },
        "Goal progress saved.",
        { idempotent: true },
      );
    if (mode === "complete") {
      setSaving(true);
      setError("");
      try {
        const evidence = await prepareQuestEvidence(form);
        if (!evidence.storagePath)
          return await send(
            `/api/v1/quests/${String(form.get("questId"))}/complete`,
            evidence,
            "Quest completed with authoritative XP and private evidence.",
            { idempotent: true },
          );
        let response: Response;
        try {
          response = await globalThis.fetch(
            `/api/v1/quests/${String(form.get("questId"))}/complete`,
            {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "idempotency-key": crypto.randomUUID(),
              },
              body: JSON.stringify(evidence),
            },
          );
        } catch {
          await cancelEvidenceUpload(evidence.storagePath);
          throw new Error(
            "Quest completion could not be confirmed, so the private upload was removed. Try again.",
          );
        }
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          await cancelEvidenceUpload(evidence.storagePath);
          throw new Error(
            payload.error?.message ||
              "Quest completion was not confirmed, so the private upload was removed. Try again.",
          );
        }
        onSuccess("Quest completed with authoritative XP and private evidence.");
        close();
        setTimeout(() => location.reload(), 500);
        return;
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Evidence could not be prepared.",
        );
        setSaving(false);
        return;
      }
    }
    if (mode === "goal")
      return send(
        "/api/v1/goals",
        {
          title: form.get("title"),
          category: form.get("category"),
          measurement: form.get("measurement"),
          targetValue: form.get("target")
            ? Number(form.get("target"))
            : undefined,
          unit: form.get("unit") || undefined,
          currency: form.get("currency") || undefined,
          priority: "normal",
        },
        "Goal created.",
      );
    if (mode === "skill")
      return send(
        "/api/v1/skills",
        { name: form.get("name"), category: form.get("category") },
        "A new branch appeared in your SkillTree.",
      );
    if (mode === "quest")
      return send(
        "/api/v1/quests",
        {
          title: form.get("title"),
          description: form.get("description") || undefined,
          goalId,
          skillId,
          skillIds: form.getAll("skillIds").map(String).filter(Boolean),
          xpReward: Number(form.get("xpReward") || 25),
          dueAt: form.get("dueAt")
            ? new Date(String(form.get("dueAt"))).toISOString()
            : undefined,
          evidenceRequired: form.get("evidenceRequired") === "on",
        },
        "Quest added to your plan.",
      );
    if (mode === "journal")
      return send(
        "/api/v1/journal",
        {
          title: form.get("title") || null,
          body: form.get("body"),
          mood: form.get("mood") || null,
        },
        "Reflection saved privately.",
      );
    return send(
      "/api/v1/habits",
      {
        name: form.get("name"),
        goalId,
        skillId,
        skillIds: form.getAll("skillIds").map(String).filter(Boolean),
        xpReward: Number(form.get("xpReward") || 10),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        frequency: { kind: "weekly", days: form.getAll("preferredDays").map(Number) },
        minimumTarget: form.get("minimumTarget") ? Number(form.get("minimumTarget")) : undefined,
        minimumUnit: form.get("minimumUnit") || undefined,
        startDate: form.get("startDate"),
        endDate: form.get("endDate") || undefined,
        reminderNextRun: form.get("reminderNextRun") ? new Date(String(form.get("reminderNextRun"))).toISOString() : undefined,
      },
      "Habit added to your routine.",
    );
  };

  const titles: Record<Mode, string> = {
    menu: "What happened?",
    activity: "Log meaningful effort",
    progress: "Update a goal",
    complete: "Complete a quest",
    goal: "Create a goal",
    skill: "Create a skill",
    quest: "Create a quest",
    habit: "Create a habit",
    journal: "Add a private note",
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
        aria-label="Quick add"
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">QUICK ADD</span>
            <h2>{titles[mode]}</h2>
          </div>
          <button
            className="icon-btn"
            onClick={close}
            aria-label="Close quick add"
          >
            <X />
          </button>
        </div>
        {optionsLoading&&<p className="modal-tip" role="status">Loading your goals, quests, and skills…</p>}
        {optionsFailed&&<div className="gentle" role="alert"><div><b>Your linked records are temporarily unavailable</b><p>You can still create an independent goal, skill, habit, or journal note. Retry before updating progress or linking work.</p><button type="button" className="outline" onClick={loadOptions}>Try again</button></div></div>}
        {mode === "menu" ? (
          <div className="quick-grid">
            <Choice
              icon={<Activity />}
              title="Log activity"
              detail="Record meaningful effort"
              onClick={() => setMode("activity")}
              featured
            />
            <Choice
              icon={<BarChart3 />}
              title="Add progress"
              detail="Update a measurable goal"
              onClick={() => setMode("progress")}
            />
            <Choice
              icon={<Check />}
              title="Complete quest"
              detail="Finish a planned action"
              onClick={() => setMode("complete")}
            />
            <Choice
              icon={<Target />}
              title="Create goal"
              detail="Choose an outcome"
              onClick={() => setMode("goal")}
            />
            <Choice
              icon={<Swords />}
              title="Create quest"
              detail="Plan a concrete next action"
              onClick={() => setMode("quest")}
            />
            <Choice
              icon={<CalendarDays />}
              title="Create habit"
              detail="Build recurring momentum"
              onClick={() => setMode("habit")}
            />
            <Choice
              icon={<Plus />}
              title="Create skill"
              detail="Add a lasting capability"
              onClick={() => setMode("skill")}
            />
            <Choice
              icon={<BookOpen />}
              title="Add journal note"
              detail="Capture a private reflection"
              onClick={() => setMode("journal")}
            />
          </div>
        ) : (
          <form className="real-form" action={submit}>
            {mode === "activity" && (
              <>
                <label>
                  What did you do?
                  <textarea name="description" required maxLength={500} />
                </label>
                <div className="form-row">
                  <label>
                    Duration (minutes)
                    <input name="duration" type="number" min="0" max="100000" />
                  </label>
                  <label>
                    When
                    <input name="occurredAt" type="datetime-local" />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    Quantity
                    <input name="quantity" type="number" min="0" step="any" />
                  </label>
                  <label>
                    Unit
                    <input
                      name="unit"
                      maxLength={40}
                      placeholder="km, pages, GBP…"
                    />
                  </label>
                </div>
                <label>
                  Effort
                  <select name="effort" defaultValue="moderate">
                    <option value="tiny">Tiny</option>
                    <option value="small">Small</option>
                    <option value="moderate">Moderate</option>
                    <option value="significant">Significant</option>
                    <option value="major">Major</option>
                  </select>
                </label>
                <ActivityLinks goals={goals} skills={skills} />
                <details>
                  <summary>Private evidence (optional)</summary>
                  <div className="evidence-fields">
                    <label>
                      Photo or document
                      <input
                        name="evidenceFile"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
                      />
                    </label>
                    <label>
                      Secure web link
                      <input
                        name="evidenceUrl"
                        type="url"
                        pattern="https://.*"
                        placeholder="https://…"
                      />
                    </label>
                    <label>
                      Evidence note
                      <textarea name="evidenceText" maxLength={2000} />
                    </label>
                  </div>
                </details>
                <label>
                  Private note
                  <textarea name="note" maxLength={2000} />
                </label>
                <small>
                  XP is proposed from effort and divided across the skills you
                  select. Evidence stays private.
                </small>
              </>
            )}
            {mode === "progress" && (
              <>
                <GoalSelect goals={goals} required />
                <label>
                  New total
                  <input
                    name="value"
                    type="number"
                    min="0"
                    step="any"
                    required
                  />
                </label>
                <label>
                  What changed?
                  <textarea name="note" maxLength={1000} />
                </label>
              </>
            )}
            {mode === "complete" && (
              <>
                <label>
                  Quest
                  <select name="questId" required>
                    <option value="">Choose a quest</option>
                    {quests.map((quest) => (
                      <option value={quest.id} key={quest.id}>
                        {quest.title}
                      </option>
                    ))}
                  </select>
                </label>
                <p>Quests marked evidence-required cannot complete without one of these private records.</p>
                <label>Photo or document<input name="questEvidenceFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain" /></label>
                <label>Secure web link<input name="questEvidenceUrl" type="url" pattern="https://.*" placeholder="https://…" /></label>
                <label>Evidence note<textarea name="questEvidenceText" maxLength={2000} /></label>
              </>
            )}
            {mode === "goal" && (
              <>
                <label>
                  Goal title
                  <input name="title" required maxLength={180} />
                </label>
                <div className="form-row">
                  <label>
                    Category
                    <input name="category" defaultValue="Other" />
                  </label>
                  <label>
                    Measurement
                    <select name="measurement" defaultValue="open_ended">
                      <option value="open_ended">Open-ended</option>
                      <option value="numeric">Numeric</option>
                      <option value="currency">Currency</option>
                      <option value="percentage">Percentage</option>
                      <option value="frequency">Frequency</option>
                      <option value="duration">Duration</option>
                      <option value="milestones">Milestones</option>
                      <option value="binary">Binary</option>
                      <option value="recurring">Recurring</option>
                      <option value="composite">Composite</option>
                      <option value="custom">Custom</option>
                    </select>
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    Target
                    <input name="target" type="number" min="0" />
                  </label>
                  <label>
                    Unit
                    <input name="unit" />
                  </label>
                </div>
                <label>
                  Currency code (if applicable)
                  <input
                    name="currency"
                    pattern="[A-Za-z]{3}"
                    maxLength={3}
                    placeholder="GBP"
                  />
                </label>
              </>
            )}
            {mode === "skill" && (
              <>
                <label>
                  Skill name
                  <input name="name" required maxLength={100} />
                </label>
                <label>
                  Category
                  <input name="category" defaultValue="Other" />
                </label>
              </>
            )}
            {mode === "quest" && (
              <>
                <label>
                  Quest title
                  <input name="title" required maxLength={180} />
                </label>
                <label>
                  Notes
                  <textarea name="description" maxLength={1000} />
                </label>
                <div className="form-row">
                  <GoalSelect goals={goals} />
                  <label>
                    XP reward
                    <input
                      name="xpReward"
                      type="number"
                      min="0"
                      max="500"
                      defaultValue="25"
                    />
                  </label>
                </div>
                <SkillMultiSelect skills={skills} />
                <label>
                  Due date
                  <input name="dueAt" type="datetime-local" />
                </label>
                <label>
                  <input name="evidenceRequired" type="checkbox" /> Require
                  evidence
                </label>
              </>
            )}
            {mode === "habit" && (
              <>
                <label>
                  Habit name
                  <input name="name" required maxLength={180} />
                </label>
                <fieldset>
                  <legend>Preferred days</legend>
                  <div className="form-actions">
                    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day,index)=><label key={day}><input name="preferredDays" type="checkbox" value={index+1} defaultChecked />{day}</label>)}
                  </div>
                </fieldset>
                <div className="form-row">
                  <label>
                    XP reward
                    <input
                      name="xpReward"
                      type="number"
                      min="0"
                      max="100"
                      defaultValue="10"
                    />
                  </label>
                </div>
                <GoalSelect goals={goals} />
                <SkillMultiSelect skills={skills} />
                <div className="form-row"><label>Minimum target<input name="minimumTarget" type="number" min="0.01" step="any" /></label><label>Unit<input name="minimumUnit" maxLength={40} placeholder="minutes, pages…" /></label></div>
                <div className="form-row"><label>Start date<input name="startDate" type="date" defaultValue={new Date().toISOString().slice(0,10)} required /></label><label>Optional end date<input name="endDate" type="date" /></label></div>
                <label>Optional reminder<input name="reminderNextRun" type="datetime-local" /></label>
              </>
            )}
            {mode === "journal" && (
              <>
                <label>
                  Title
                  <input name="title" maxLength={160} />
                </label>
                <label>
                  Reflection
                  <textarea name="body" required maxLength={10000} />
                </label>
                <label>
                  Mood
                  <input name="mood" maxLength={40} />
                </label>
              </>
            )}
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="outline"
                onClick={() => {
                  setMode("menu");
                  setError("");
                }}
              >
                Back
              </button>
              <button className="primary" disabled={saving}>
                {saving ? (
                  "Saving…"
                ) : (
                  <>
                    <Check /> Save
                  </>
                )}
              </button>
            </div>
          </form>
        )}
        <p className="modal-tip">
          <Zap /> Server-authoritative XP · Private by default
        </p>
      </div>
    </div>
  );
}

function Choice({
  icon,
  title,
  detail,
  onClick,
  featured = false,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
  featured?: boolean;
}) {
  return (
    <button className={featured ? "featured" : ""} onClick={onClick}>
      <span>{icon}</span>
      <div>
        <b>{title}</b>
        <small>{detail}</small>
      </div>
      <ChevronRight />
    </button>
  );
}
function GoalSelect({
  goals,
  required = false,
}: {
  goals: Option[];
  required?: boolean;
}) {
  return (
    <label>
      Related goal
      <select name="goalId" required={required}>
        <option value="">{required ? "Choose a goal" : "No goal"}</option>
        {goals.map((goal) => (
          <option value={goal.id} key={goal.id}>
            {goal.title}
          </option>
        ))}
      </select>
    </label>
  );
}
function SkillMultiSelect({ skills }: { skills: Option[] }) {
  return (
    <label>
      Linked skills
      <select name="skillIds" multiple size={Math.min(5, Math.max(2, skills.length))}>
        {skills.map((skill) => (
          <option value={skill.id} key={skill.id}>{skill.name}</option>
        ))}
      </select>
      <small>Use Ctrl/Cmd to choose several.</small>
    </label>
  );
}
function ActivityLinks({
  goals,
  skills,
}: {
  goals: Option[];
  skills: Option[];
}) {
  return (
    <div className="form-row">
      <label>
        Related goals
        <select
          name="goalIds"
          multiple
          size={Math.min(4, Math.max(2, goals.length))}
        >
          {goals.map((goal) => (
            <option value={goal.id} key={goal.id}>
              {goal.title}
            </option>
          ))}
        </select>
        <small>Use Ctrl/Cmd to choose several.</small>
      </label>
      <label>
        Skills earning XP
        <select
          name="skillIds"
          multiple
          size={Math.min(4, Math.max(2, skills.length))}
        >
          {skills.map((skill) => (
            <option value={skill.id} key={skill.id}>
              {skill.name}
            </option>
          ))}
        </select>
        <small>XP is split evenly across selected skills.</small>
      </label>
    </div>
  );
}
