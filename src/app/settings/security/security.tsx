/* eslint-disable @next/next/no-location-assign-relative-destination, @next/next/no-img-element */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { clearOfflineData } from "@/lib/offline/queue";
import "./security.css";
type Factor = {
  id: string;
  friendly_name?: string;
  status: string;
  created_at: string;
};
export default function SecuritySettings() {
  const [factors, setFactors] = useState<Factor[]>([]),
    [enrolment, setEnrolment] = useState<{
      id: string;
      qr: string;
      secret: string;
    } | null>(null),
    [code, setCode] = useState(""),
    [error, setError] = useState("");
  const refresh = () =>
    createClient()
      ?.auth.mfa.listFactors()
      .then(({ data }) => setFactors(data?.totp || []));
  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    return () => clearTimeout(timer);
  }, []);
  const enroll = async () => {
    const client = createClient();
    if (!client) return;
    setError("");
    const { data, error } = await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "SkillTree authenticator",
    });
    if (error) {
      setError(error.message);
      return;
    }
    setEnrolment({
      id: data.id,
      qr: data.totp.qr_code,
      secret: data.totp.secret,
    });
  };
  const verify = async () => {
    const client = createClient();
    if (!client || !enrolment) return;
    const { error } = await client.auth.mfa.challengeAndVerify({
      factorId: enrolment.id,
      code,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setEnrolment(null);
    setCode("");
    refresh();
  };
  const remove = async (id: string) => {
    const client = createClient();
    if (!client) return;
    const { error } = await client.auth.mfa.unenroll({ factorId: id });
    if (error) setError(error.message);
    else refresh();
  };
  return (
    <main className="security-page">
      <header>
        <Link href="/app">
          <ArrowLeft /> Back to SkillTree
        </Link>
        <h1>Account security</h1>
        <p>Manage authenticator factors and active sessions.</p>
      </header>
      <section className="security-card">
        <div>
          <ShieldCheck />
          <span>
            <h2>Authenticator app</h2>
            <p>Add a time-based one-time password as a second factor.</p>
          </span>
          {!enrolment && <button onClick={enroll}>Add authenticator</button>}
        </div>
        {error && <div className="security-error">{error}</div>}
        {enrolment && (
          <div className="enrolment">
            <img src={enrolment.qr} alt="Authenticator QR code" />
            <p>Scan this QR code, or enter this secret manually:</p>
            <code>{enrolment.secret}</code>
            <label>
              Six-digit code
              <input
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
              />
            </label>
            <button onClick={verify} disabled={code.length !== 6}>
              Enable MFA
            </button>
          </div>
        )}
        {factors
          .filter((f) => f.status === "verified")
          .map((factor) => (
            <div className="factor" key={factor.id}>
              <span>
                <b>{factor.friendly_name || "Authenticator"}</b>
                <small>
                  Added{" "}
                  {new Intl.DateTimeFormat("en-GB").format(
                    new Date(factor.created_at),
                  )}
                </small>
              </span>
              <button
                onClick={() => remove(factor.id)}
                aria-label="Remove authenticator"
              >
                <Trash2 />
              </button>
            </div>
          ))}
      </section>
      <section className="security-card">
        <h2>All sessions</h2>
        <p>
          Signing out everywhere invalidates refresh sessions on your other
          devices.
        </p>
        <button
          className="danger"
          onClick={async () => {
            await fetch("/api/v1/account/sign-out-all", { method: "POST" });
            await clearOfflineData();
            location.href = "/sign-in";
          }}
        >
          Sign out all sessions
        </button>
      </section>
    </main>
  );
}
