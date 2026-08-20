"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, Leaf, ShieldCheck } from "lucide-react";
export default function WorkspaceCreate() {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const submit = async (form: FormData) => {
    setBusy(true);
    setError("");
    const response = await fetch("/api/v1/organizations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          slug: form.get("slug"),
          jobTitle: form.get("jobTitle"),
        }),
      }),
      body = await response.json();
    if (!response.ok) {
      setError(body.error?.message || "Your workspace could not be created.");
      setBusy(false);
      return;
    }
    router.push(`/workspace/${body.data.id}`);
  };
  return (
    <main className="workspace-auth">
      <header>
        <Link href="/app">
          <Leaf /> SkillTree IRL
        </Link>
        <Link href="/app">Personal SkillTree</Link>
      </header>
      <form className="workspace-panel" action={submit}>
        <Building2 className="workspace-mark" />
        <p className="eyebrow">COMPANY ONBOARDING</p>
        <h1>Create your company workspace</h1>
        <p>
          Your private goals, journal, evidence and history remain separate.
          Only activity created inside this workspace is visible to its members.
        </p>
        <label>
          Company or team name
          <input
            name="name"
            required
            minLength={2}
            maxLength={120}
            placeholder="Acme Studio"
          />
        </label>
        <label>
          Workspace address
          <input
            name="slug"
            required
            pattern="[a-z0-9-]+"
            placeholder="acme-studio"
          />
          <small>Lowercase letters, numbers and hyphens.</small>
        </label>
        <label>
          Your role or job title
          <input
            name="jobTitle"
            maxLength={120}
            placeholder="Founder, People lead, Team manager"
          />
        </label>
        <div className="privacy-note">
          <ShieldCheck />
          <span>
            <b>Privacy by design</b>Company admins cannot browse anyone’s
            personal SkillTree.
          </span>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? "Creating workspace…" : "Create workspace"}
        </button>
        <small>
          By creating a workspace, you agree to the{" "}
          <Link href="/terms">Terms</Link> and confirm you are authorised to act
          for the organization.
        </small>
      </form>
    </main>
  );
}
