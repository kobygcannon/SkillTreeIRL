import Link from "next/link";
import { Leaf, Sparkles } from "lucide-react";
import { magicLink, oauth, signIn, signUp } from "./actions";
import "./signin.css";
import { safeReturnPath } from "@/lib/security/redirect";
import { publicRegistrationReady } from "@/lib/registration";

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const signup = params.mode === "signup";
  const next = safeReturnPath(params.next);
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  const appleEnabled = process.env.NEXT_PUBLIC_APPLE_AUTH_ENABLED === "true";
  const socialEnabled = googleEnabled || appleEnabled;
  const registrationOpen = publicRegistrationReady();

  return (
    <main className="auth-page">
      <section className="auth-brand">
        <Link href="/" className="auth-logo">
          <span>
            <Leaf />
          </span>
          SkillTree <em>IRL</em>
        </Link>
        <div>
          <span className="auth-kicker">
            <Sparkles /> YOUR PROGRESS, PERMANENTLY YOURS
          </span>
          <h1>
            Goals change.
            <br />
            Your character keeps growing.
          </h1>
          <p>
            Build skills through meaningful real-world action and keep the story
            of who you’re becoming.
          </p>
        </div>
        <small>
          Private by default · No XP for sale · Your history remains yours
        </small>
      </section>
      <section className="auth-form">
        <div>
          <h2>{signup ? "Create your SkillTree" : "Welcome back"}</h2>
          <p>
            {signup
              ? "Start with one goal. Grow from there."
              : "Continue building your real-world character."}
          </p>
          {params.error && (
            <div className="auth-error">
              {params.error === "not_configured"
                ? "Supabase credentials are not configured yet."
                : params.error === "registration_closed"
                  ? "Public registration is not open yet. The launch readiness checks are still being completed."
                  : decodeURIComponent(params.error)}
            </div>
          )}
          {params.message && (
            <div className="auth-success">Check your email to continue.</div>
          )}
          {socialEnabled && (
            <>
              <div className="social-row">
                {googleEnabled && (
                  <form action={oauth}>
                    <input type="hidden" name="provider" value="google" />
                    <input type="hidden" name="next" value={next} />
                    <button className="auth-secondary">
                      Continue with Google
                    </button>
                  </form>
                )}
                {appleEnabled && (
                  <form action={oauth}>
                    <input type="hidden" name="provider" value="apple" />
                    <input type="hidden" name="next" value={next} />
                    <button className="auth-secondary">
                      Continue with Apple
                    </button>
                  </form>
                )}
              </div>
              <div className="or">
                <span>or</span>
              </div>
            </>
          )}
          {signup && !registrationOpen && (
            <div className="auth-error" role="status">
              Public registration is temporarily closed while legal identity,
              billing and operational readiness are completed. Explore the demo
              or return later; existing accounts can still sign in.
            </div>
          )}
          {(!signup || registrationOpen) && (
            <form action={signup ? signUp : signIn}>
              {!signup && <input type="hidden" name="next" value={next} />}
              {signup && (
                <label>
                  Display name
                  <input
                    name="displayName"
                    required
                    minLength={1}
                    maxLength={80}
                    autoComplete="name"
                  />
                </label>
              )}
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={signup ? "new-password" : "current-password"}
                />
              </label>
              <button className="auth-primary">
                {signup ? "Build my SkillTree" : "Sign in"}
              </button>
            </form>
          )}
          {!signup && (
            <>
              <p className="recovery-link">
                <Link href="/recover">Forgot password?</Link>
              </p>
              <div className="or">
                <span>or</span>
              </div>
              <form action={magicLink}>
                <input type="hidden" name="next" value={next} />
                <label>
                  Email for magic link
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                  />
                </label>
                <button className="auth-secondary">
                  Email me a sign-in link
                </button>
              </form>
            </>
          )}
          <p className="switch">
            {signup ? "Already have an account?" : "New to SkillTree?"}{" "}
            <Link
              href={
                signup
                  ? `/sign-in?next=${encodeURIComponent(next)}`
                  : `/sign-in?mode=signup&next=${encodeURIComponent(next)}`
              }
            >
              {signup ? "Sign in" : "Create your account"}
            </Link>
          </p>
          <Link href="/" className="demo-link">
            Explore the interactive demo
          </Link>
        </div>
      </section>
    </main>
  );
}
