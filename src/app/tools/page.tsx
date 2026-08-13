/* A normal anchor is intentional for the OAuth initiation endpoint: Next Link prefetch must not start OAuth. */
/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { parseCsv } from "@/lib/csv";

type Journal = {
  id: string;
  title: string | null;
  body: string;
  mood: string | null;
  occurred_on: string;
};
type Integration = {
  id: string;
  provider: string;
  status: string;
  last_synced_at: string | null;
  error_code?: string | null;
};
type ImportJob = {
  id: string;
  filename: string | null;
  status: string;
  processed_rows: number;
  total_rows: number;
  error_rows: number;
};
type Notice = {
  id: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};
type CsvRow = Record<string, string>;

export default function Tools() {
  const [journal, setJournal] = useState<Journal[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [imports, setImports] = useState<ImportJob[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [review, setReview] = useState<Record<string, unknown> | null>(null);
  const [preview, setPreview] = useState<{
    filename: string;
    rows: CsvRow[];
  } | null>(null);
  const [message, setMessage] = useState("");
  const load = () =>
    Promise.all([
      fetch("/api/v1/journal").then((response) => response.json()),
      fetch("/api/v1/integrations").then((response) => response.json()),
      fetch("/api/v1/imports").then((response) => response.json()),
      fetch("/api/v1/notifications").then((response) => response.json()),
    ]).then(([journalBody, integrationBody, importBody, noticeBody]) => {
      setJournal(journalBody.data || []);
      setIntegrations(integrationBody.data || []);
      setImports(importBody.data || []);
      setNotices(noticeBody.data || []);
    });
  useEffect(() => {
    Promise.all([
      fetch("/api/v1/journal").then((response) => response.json()),
      fetch("/api/v1/integrations").then((response) => response.json()),
      fetch("/api/v1/imports").then((response) => response.json()),
      fetch("/api/v1/notifications").then((response) => response.json()),
    ]).then(([journalBody, integrationBody, importBody, noticeBody]) => {
      setJournal(journalBody.data || []);
      setIntegrations(integrationBody.data || []);
      setImports(importBody.data || []);
      setNotices(noticeBody.data || []);
    });
  }, []);
  const addJournal = async (form: FormData) => {
    const response = await fetch("/api/v1/journal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        body: form.get("body"),
        mood: form.get("mood"),
      }),
    });
    setMessage(
      response.ok ? "Journal entry saved." : "Entry could not be saved.",
    );
    load();
  };
  const deleteJournal = async (id: string) => {
    if (!confirm("Delete this private journal entry?")) return;
    const response = await fetch(`/api/v1/journal/${id}`, { method: "DELETE" });
    setMessage(
      response.ok ? "Journal entry deleted." : "Entry could not be deleted.",
    );
    load();
  };
  const chooseCsv = async (file?: File) => {
    if (!file) return setPreview(null);
    try {
      const rows = parseCsv(await file.text()) as CsvRow[];
      if (!rows.length) throw new Error();
      setPreview({ filename: file.name, rows });
      setMessage(
        `${rows.length} rows validated. Review the preview before confirming.`,
      );
    } catch {
      setPreview(null);
      setMessage(
        "That CSV could not be parsed. Check its headings and quoting.",
      );
    }
  };
  const importCsv = async () => {
    if (!preview) return;
    const response = await fetch("/api/v1/imports", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        source: "csv_activity",
        filename: preview.filename,
        rows: preview.rows,
      }),
    });
    setMessage(
      response.ok
        ? `${preview.rows.length} rows queued safely.`
        : "Import could not be queued.",
    );
    if (response.ok) setPreview(null);
    load();
  };
  const yearReview = async () => {
    const year = new Date().getFullYear();
    const response = await fetch(`/api/v1/year-reviews/${year}`);
    const body = await response.json();
    if (response.ok) setReview(body.data.snapshot);
    else setMessage("Year review could not be generated.");
  };
  const markRead = async () => {
    await fetch("/api/v1/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    load();
  };
  const syncIntegration = async (id: string) => {
    setMessage("Syncing integration…");
    const response = await fetch(`/api/v1/integrations/${id}/sync`, {
      method: "POST",
    });
    const body = await response.json().catch(() => ({}));
    setMessage(
      response.ok
        ? `${body.data?.processed || 0} provider events checked safely.`
        : body.error?.message || "Integration sync failed.",
    );
    load();
  };
  const disconnectIntegration = async (id: string) => {
    if (!confirm("Disconnect this integration? Imported history will remain."))
      return;
    const response = await fetch(`/api/v1/integrations/${id}`, {
      method: "DELETE",
    });
    setMessage(
      response.ok
        ? "Integration disconnected. Existing history remains."
        : "Integration could not be disconnected.",
    );
    load();
  };
  return (
    <main className="onboard">
      <header>
        <Link href="/app" className="onboard-logo">
          SkillTree IRL
        </Link>
        <Link href="/app">Back to app</Link>
      </header>
      <section>
        <div className="onboard-card">
          <p className="kicker">TOOLS & RECORDS</p>
          <h1>Your wider SkillTree</h1>
          {message && (
            <p className="modal-tip" role="status">
              {message}
            </p>
          )}
          <div className="detail-grid">
            <div>
              <form className="real-form card side-card" action={addJournal}>
                <h2>Journal</h2>
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
                <button className="primary">Save reflection</button>
              </form>
              {journal.slice(0, 10).map((entry) => (
                <article className="card side-card" key={entry.id}>
                  <small>
                    {entry.occurred_on}
                    {entry.mood ? ` · ${entry.mood}` : ""}
                  </small>
                  <h3>{entry.title || "Reflection"}</h3>
                  <p>{entry.body}</p>
                  <button
                    className="outline"
                    onClick={() => deleteJournal(entry.id)}
                  >
                    Delete
                  </button>
                </article>
              ))}
            </div>
            <div>
              <div className="card side-card">
                <h2>Notifications</h2>
                <button
                  className="outline"
                  onClick={markRead}
                  disabled={!notices.some((notice) => !notice.read_at)}
                >
                  Mark all read
                </button>
                {notices.slice(0, 10).map((notice) => (
                  <p key={notice.id}>
                    <b>{notice.title}</b>
                    <br />
                    <small>
                      {notice.body}
                      {notice.read_at ? " · Read" : " · New"}
                    </small>
                  </p>
                ))}
                {!notices.length && <p>No notifications yet.</p>}
              </div>
              <div className="real-form card side-card">
                <h2>CSV import</h2>
                <p>
                  Choose a file, validate and preview it, then explicitly
                  confirm. Repeated jobs and rows are deduplicated.
                </p>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => chooseCsv(event.target.files?.[0])}
                />
                {preview && (
                  <>
                    <div className="history-list">
                      <b>
                        {preview.rows.length} rows ·{" "}
                        {Object.keys(preview.rows[0] || {}).join(", ")}
                      </b>
                      {preview.rows.slice(0, 3).map((row, index) => (
                        <pre key={index}>{JSON.stringify(row, null, 2)}</pre>
                      ))}
                    </div>
                    <div className="form-actions">
                      <button
                        className="outline"
                        onClick={() => setPreview(null)}
                      >
                        Cancel
                      </button>
                      <button className="primary" onClick={importCsv}>
                        Confirm import
                      </button>
                    </div>
                  </>
                )}
                {imports.slice(0, 5).map((job) => (
                  <small key={job.id}>
                    {job.filename || "Import"}: {job.status} ·{" "}
                    {job.processed_rows}/{job.total_rows} · {job.error_rows}{" "}
                    errors
                  </small>
                ))}
              </div>
              <div className="card side-card">
                <h2>Integrations</h2>
          {!integrations.some(
            (integration) =>
              integration.provider === "github" &&
              !["revoked", "disconnected"].includes(integration.status),
          ) && (
                  <a
                    className="primary"
                    href="/api/v1/integrations/github/connect"
                  >
                    Connect GitHub
                  </a>
                )}
                {integrations.map((integration) => (
                  <article key={integration.id}>
                    <p>
                      <b>{integration.provider}</b>
                      <br />
                      <small>
                        {integration.status}
                    {integration.last_synced_at
                      ? ` · synced ${new Date(integration.last_synced_at).toLocaleString()}`
                      : ""}
                    {integration.error_code
                      ? " · last sync was incomplete; retry safely"
                      : ""}
                      </small>
                    </p>
                    {integration.status === "connected" && (
                      <div className="form-actions">
                        <button
                          className="outline"
                          onClick={() => syncIntegration(integration.id)}
                        >
                          Sync now
                        </button>
                        <button
                          className="outline"
                          onClick={() => disconnectIntegration(integration.id)}
                        >
                          Disconnect
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
              <div className="card side-card">
                <h2>Year review</h2>
                <button className="outline" onClick={yearReview}>
                  Generate this year
                </button>
                {review && (
                  <div>
                    {Object.entries(review).map(([key, value]) => (
                      <p key={key}>
                        <b>{key.replaceAll("_", " ")}</b>
                        <br />
                        <span>
                          {typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value)}
                        </span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
