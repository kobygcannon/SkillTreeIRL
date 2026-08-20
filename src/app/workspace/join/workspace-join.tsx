"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, Leaf, ShieldCheck } from "lucide-react";
export default function WorkspaceJoin({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const accept = async () => {
    setBusy(true);
    const response = await fetch("/api/v1/organization-invitations/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      }),
      body = await response.json();
    if (!response.ok) {
      setError(body.error?.message || "This invitation could not be accepted.");
      setBusy(false);
      return;
    }
    router.push(`/workspace/${body.data.organizationId}`);
  };
  return (
    <main className="workspace-auth">
      <header>
        <Link href="/app">
          <Leaf /> SkillTree IRL
        </Link>
      </header>
      <section className="workspace-panel">
        <Building2 className="workspace-mark" />
        <p className="eyebrow">TEAM INVITATION</p>
        <h1>Join a company workspace</h1>
        <p>
          You will have a separate workspace identity. Your personal goals,
          journal, evidence, friends and history stay private.
        </p>
        <div className="privacy-note">
          <ShieldCheck />
          <span>
            <b>You control the boundary</b>Only company objectives and check-ins
            you submit in the workspace can be shared.
          </span>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy} onClick={accept}>
          {busy ? "Joining…" : "Accept invitation"}
        </button>
        <Link href="/app">Decline and return to my SkillTree</Link>
      </section>
    </main>
  );
}
