"use client";

import { FileUp, Link as LinkIcon, LoaderCircle, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";

type Evidence = {
  id: string;
  evidence_type: string;
  external_url: string | null;
  text_note: string | null;
  signedUrl?: string | null;
  created_at: string;
};

export default function ActivityEvidenceManager({
  activityId,
}: {
  activityId: string;
}) {
  const [items, setItems] = useState<Evidence[]>([]),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState("");
  const load = async () => {
    setLoading(true);
    const response = await fetch(`/api/v1/activities/${activityId}/evidence`);
    const body = await response.json().catch(() => ({}));
    if (response.ok) setItems(body.data || []);
    else setMessage(body.error?.message || "Evidence could not be loaded.");
    setLoading(false);
  };
  useEffect(() => {
    let active = true;
    fetch(`/api/v1/activities/${activityId}/evidence`)
      .then(async (response) => ({
        response,
        body: await response.json().catch(() => ({})),
      }))
      .then(({ response, body }) => {
        if (!active) return;
        if (response.ok) setItems(body.data || []);
        else setMessage(body.error?.message || "Evidence could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activityId]);
  const attach = async (form: FormData) => {
    setSaving(true);
    setMessage("");
    try {
      const file = form.get("file"),
        url = String(form.get("url") || "").trim(),
        textNote = String(form.get("textNote") || "").trim();
      if (!(file instanceof File && file.size) && !url && !textNote)
        throw new Error("Choose a file, secure link, or evidence note.");
      const attachments: Array<Record<string, unknown>> = [];
      if (file instanceof File && file.size) {
        if (!navigator.onLine)
          throw new Error("File evidence needs an internet connection.");
        const reservation = await fetch("/api/v1/evidence/upload", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ mimeType: file.type, size: file.size }),
          }),
          reserved = await reservation.json().catch(() => ({}));
        if (!reservation.ok)
          throw new Error(
            reserved.error?.message || "Evidence upload could not start.",
          );
        const storage = createBrowserSupabase();
        if (!storage) throw new Error("Evidence storage is not configured.");
        const { error: uploadError } = await storage.storage
          .from("evidence")
          .uploadToSignedUrl(reserved.data.path, reserved.data.token, file, {
            contentType: file.type,
          });
        if (uploadError)
          throw new Error("The evidence file could not be uploaded.");
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
        const response = await fetch(
          `/api/v1/activities/${activityId}/evidence`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(attachment),
          },
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(
            body.error?.message || "Evidence could not be attached.",
          );
      }
      (
        document.getElementById(`evidence-${activityId}`) as HTMLFormElement
      )?.reset();
      setMessage("Private evidence attached.");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Evidence could not be attached.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="card side-card">
      <h2>Private evidence</h2>
      <p>
        Evidence is visible only to you unless you explicitly share it
        elsewhere.
      </p>
      {message && <p role="status">{message}</p>}
      {loading ? (
        <LoaderCircle className="spin" />
      ) : items.length ? (
        items.map((item) => (
          <div className="linked" key={item.id}>
            <span>{item.signedUrl ? <FileUp /> : <LinkIcon />}</span>
            <div>
              <b>{item.evidence_type}</b>
              <small>{new Date(item.created_at).toLocaleString()}</small>
              {item.text_note && <p>{item.text_note}</p>}
              {item.signedUrl && (
                <a href={item.signedUrl} rel="noreferrer">
                  Open private file
                </a>
              )}
              {item.external_url?.startsWith("https://") && (
                <a href={item.external_url} rel="noreferrer">
                  Open secure source
                </a>
              )}
            </div>
          </div>
        ))
      ) : (
        <p>No evidence attached.</p>
      )}
      <details>
        <summary>
          <Plus /> Add evidence
        </summary>
        <form
          id={`evidence-${activityId}`}
          className="real-form"
          action={attach}
        >
          <label>
            Photo or document
            <input
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
            />
          </label>
          <label>
            Secure web link
            <input
              name="url"
              type="url"
              pattern="https://.*"
              placeholder="https://…"
            />
          </label>
          <label>
            Evidence note
            <textarea name="textNote" maxLength={2000} />
          </label>
          <button className="outline" disabled={saving}>
            {saving ? "Attaching…" : "Attach privately"}
          </button>
        </form>
      </details>
    </div>
  );
}
