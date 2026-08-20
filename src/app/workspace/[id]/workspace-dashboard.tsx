"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Copy, Leaf, Plus, ShieldCheck, Users } from "lucide-react";
type Member = {
  user_id: string;
  display_name: string;
  role: "owner" | "admin" | "manager" | "member";
  status: string;
  job_title: string | null;
};
type Objective = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  measurement: string;
  target_value: number | null;
  unit: string | null;
  due_at: string | null;
};
type Data = {
  currentUserId: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    onboarding_completed_at: string | null;
  };
  members: Member[];
  objectives: Objective[];
  assignments: {
    objective_id: string;
    user_id: string;
    current_value: number;
    status: string;
  }[];
  subscription: {
    plan: string;
    status: string;
    seat_quantity: number;
    cancel_at_period_end: boolean;
  } | null;
};
export default function WorkspaceDashboard({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [invite, setInvite] = useState("");
  const load = useCallback(
    () =>
      fetch(`/api/v1/organizations/${id}`)
        .then(async (r) => {
          const body = await r.json();
          if (!r.ok) throw new Error(body.error?.message);
          setData(body.data);
        })
        .catch((e) => setError(e.message || "Workspace unavailable")),
    [id],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const me = useMemo(
    () => data?.members.find((m) => m.user_id === data.currentUserId),
    [data],
  );
  const canManage = ["owner", "admin", "manager"].includes(me?.role || "");
  const createObjective = async (form: FormData) => {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/v1/organizations/${id}/objectives`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description"),
          dueAt: form.get("dueAt") || undefined,
          assignees: form.getAll("assignees"),
        }),
      }),
      body = await response.json();
    if (!response.ok)
      setError(body.error?.message || "Objective could not be created.");
    else await load();
    setBusy(false);
  };
  const inviteMember = async (form: FormData) => {
    setBusy(true);
    setInvite("");
    setError("");
    const response = await fetch(`/api/v1/organizations/${id}/invitations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          role: form.get("role"),
        }),
      }),
      body = await response.json();
    if (!response.ok)
      setError(body.error?.message || "Invitation could not be created.");
    else setInvite(body.data.inviteUrl);
    setBusy(false);
  };
  const billing = async (kind: "checkout" | "portal") => {
    setBusy(true);
    setError("");
    const response = await fetch(
        `/api/v1/organizations/${id}/billing/${kind}`,
        { method: "POST" },
      ),
      body = await response.json();
    if (!response.ok) {
      setError(body.error?.message || "Billing is temporarily unavailable.");
      setBusy(false);
      return;
    }
    if (
      typeof body.data.url === "string" &&
      body.data.url.startsWith("https://")
    )
      location.assign(body.data.url);
    else router.push(`/workspace/${id}`);
  };
  const checkIn = async (objectiveId: string, form: FormData) => {
    setBusy(true);
    setError("");
    const response = await fetch(
        `/api/v1/organizations/${id}/objectives/${objectiveId}/checkins`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            progressValue: Number(form.get("progressValue")),
            summary: form.get("summary"),
            visibility: form.get("visibility"),
          }),
        },
      ),
      body = await response.json();
    if (!response.ok)
      setError(body.error?.message || "Your check-in could not be saved.");
    else await load();
    setBusy(false);
  };
  if (error && !data)
    return (
      <main className="workspace-shell">
        <div className="workspace-empty">
          <h1>Workspace unavailable</h1>
          <p>{error}</p>
          <Link href="/app">Return to SkillTree</Link>
        </div>
      </main>
    );
  if (!data)
    return (
      <main className="workspace-shell">
        <div className="workspace-empty">Loading your workspace…</div>
      </main>
    );
  return (
    <main className="workspace-shell">
      <aside>
        <Link className="workspace-logo" href="/app">
          <Leaf /> SkillTree IRL
        </Link>
        <div className="workspace-name">
          <Building2 />
          <span>
            <small>WORKSPACE</small>
            <b>{data.organization.name}</b>
          </span>
        </div>
        <nav>
          <a href="#overview">Overview</a>
          <a href="#objectives">Objectives</a>
          <a href="#people">People</a>
          <a href="#billing">Plan & billing</a>
        </nav>
        <div className="workspace-private">
          <ShieldCheck />
          <span>
            <b>Personal stays private</b>Your private SkillTree is never visible
            here.
          </span>
        </div>
        <Link href="/app">← Personal SkillTree</Link>
      </aside>
      <section className="workspace-main">
        <header>
          <div>
            <p className="eyebrow">COMPANY SKILLTREE</p>
            <h1>{data.organization.name}</h1>
          </div>
          <span className="role-chip">{me?.role || "member"}</span>
        </header>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="workspace-stats" id="overview">
          <article>
            <b>{data.members.length}</b>
            <span>active people</span>
          </article>
          <article>
            <b>{data.objectives.filter((o) => o.status === "active").length}</b>
            <span>active objectives</span>
          </article>
          <article>
            <b>
              {data.assignments.filter((a) => a.status === "completed").length}
            </b>
            <span>completed assignments</span>
          </article>
        </div>
        <section className="workspace-section" id="objectives">
          <div className="workspace-heading">
            <div>
              <p className="eyebrow">SHARED DIRECTION</p>
              <h2>Team objectives</h2>
            </div>
          </div>
          <div className="objective-grid">
            {data.objectives.map((objective) => {
              const myAssignment = data.assignments.find(
                (a) =>
                  a.objective_id === objective.id &&
                  a.user_id === data.currentUserId,
              );
              return (
                <article key={objective.id}>
                  <span className={`objective-status ${objective.status}`}>
                    {objective.status}
                  </span>
                  <h3>{objective.title}</h3>
                  <p>
                    {objective.description || "A shared outcome for this team."}
                  </p>
                  <div className="objective-meta">
                    <span>
                      {
                        data.assignments.filter(
                          (a) => a.objective_id === objective.id,
                        ).length
                      }{" "}
                      assigned
                    </span>
                    {objective.due_at && (
                      <span>
                        Due{" "}
                        {new Intl.DateTimeFormat("en-GB", {
                          dateStyle: "medium",
                        }).format(new Date(objective.due_at))}
                      </span>
                    )}
                  </div>
                  {myAssignment && (
                    <details className="checkin">
                      <summary>
                        Update my progress · {myAssignment.current_value}
                        {objective.unit || ""}
                      </summary>
                      <form action={(form) => checkIn(objective.id, form)}>
                        <label>
                          Current progress
                          <input
                            name="progressValue"
                            type="number"
                            min="0"
                            step="any"
                            defaultValue={myAssignment.current_value}
                            required
                          />
                        </label>
                        <label>
                          What changed?
                          <textarea
                            name="summary"
                            maxLength={2000}
                            required
                            placeholder="A concise update for your manager or team."
                          />
                        </label>
                        <label>
                          Who can see this?
                          <select name="visibility">
                            <option value="managers">Managers only</option>
                            <option value="workspace">
                              Everyone in workspace
                            </option>
                          </select>
                        </label>
                        <button className="primary" disabled={busy}>
                          Save check-in
                        </button>
                      </form>
                    </details>
                  )}
                </article>
              );
            })}
            {!data.objectives.length && (
              <div className="workspace-empty">
                <h3>No team objectives yet</h3>
                <p>
                  Create a clear outcome, assign it deliberately, and let
                  members check in without exposing their private goals.
                </p>
              </div>
            )}
          </div>
          {canManage && (
            <details className="workspace-form">
              <summary>
                <Plus /> Create objective
              </summary>
              <form action={createObjective}>
                <label>
                  Outcome
                  <input
                    name="title"
                    required
                    maxLength={180}
                    placeholder="Improve customer onboarding quality"
                  />
                </label>
                <label>
                  Why it matters
                  <textarea name="description" maxLength={2000} />
                </label>
                <label>
                  Due date
                  <input name="dueAt" type="date" />
                </label>
                <fieldset>
                  <legend>Assign people</legend>
                  {data.members
                    .filter((m) => m.status === "active")
                    .map((member) => (
                      <label className="check" key={member.user_id}>
                        <input
                          type="checkbox"
                          name="assignees"
                          value={member.user_id}
                        />
                        {member.display_name} <small>{member.role}</small>
                      </label>
                    ))}
                </fieldset>
                <button className="primary" disabled={busy}>
                  Create objective
                </button>
              </form>
            </details>
          )}
        </section>
        <section className="workspace-section" id="people">
          <div className="workspace-heading">
            <div>
              <p className="eyebrow">PEOPLE & ACCESS</p>
              <h2>Workspace members</h2>
            </div>
            <Users />
          </div>
          <div className="member-list">
            {data.members.map((member) => (
              <article key={member.user_id}>
                <span className="member-avatar">
                  {member.display_name
                    .split(/\s+/)
                    .map((x) => x[0])
                    .join("")
                    .slice(0, 2)}
                </span>
                <div>
                  <b>{member.display_name}</b>
                  <small>{member.job_title || "Team member"}</small>
                </div>
                <span className="role-chip">{member.role}</span>
              </article>
            ))}
          </div>
          {["owner", "admin"].includes(me?.role || "") && (
            <form className="workspace-form inline" action={inviteMember}>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="person@company.com"
                />
              </label>
              <label>
                Role
                <select name="role">
                  <option value="member">Member</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <button className="primary" disabled={busy}>
                Create secure invite
              </button>
              {invite && (
                <div className="invite-result">
                  <label>
                    Invitation link
                    <input readOnly value={invite} />
                  </label>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(invite)}
                    aria-label="Copy invitation"
                  >
                    <Copy />
                  </button>
                  <small>
                    Expires in 7 days and only works for the invited email.
                  </small>
                </div>
              )}
            </form>
          )}
        </section>
        <section className="workspace-section" id="billing">
          <p className="eyebrow">PLAN & BILLING</p>
          <h2>
            {data.subscription?.status === "active"
              ? "Company plan active"
              : "Company plan"}
          </h2>
          <p>
            {data.subscription?.status === "active"
              ? `${data.subscription.seat_quantity} seats are billed for this workspace.`
              : "Your workspace is ready for a company subscription. Checkout will only be offered when live company pricing is configured."}
          </p>
          {data.subscription?.cancel_at_period_end && (
            <p className="form-error">
              The plan will end after its current billing period. Workspace data
              will be retained according to the Terms.
            </p>
          )}
          {["owner", "admin"].includes(me?.role || "") && (
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                billing(
                  data.subscription?.status === "active" ||
                    data.subscription?.status === "trialing"
                    ? "portal"
                    : "checkout",
                )
              }
            >
              {data.subscription?.status === "active" ||
              data.subscription?.status === "trialing"
                ? "Manage seats, payment or cancellation"
                : "Start 14-day company trial"}
            </button>
          )}
          <Link className="outline-link" href="/pricing">
            Compare plans
          </Link>
        </section>
      </section>
    </main>
  );
}
