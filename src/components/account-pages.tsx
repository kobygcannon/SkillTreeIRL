"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {
  Download,
  ExternalLink,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {clearOfflineData} from "@/lib/offline/queue";
type AccountData = {
  profile: {
    display_name: string;
    timezone: string;
    character_xp: number;
    public_slug?: string | null;
    visibility?: string;
    bio?: string | null;
    accent?: string;
    avatar_style?: string;
    tree_style?: string;
    profile_layout?: string;
  };
  preferences: {
    theme: string;
    gamification: string;
    focus_limit: number;
    locale: string;
    celebrations: boolean;
    reduced_motion: boolean;
  };
};
function Message({ text, error = false }: { text: string; error?: boolean }) {
  return text ? (
    <p className={error ? "form-error" : "modal-tip"}>{text}</p>
  ) : null;
}

export function LiveProfile({
  fallbackName = "Adventurer",
  level = 1,
  lifetimeXp = 0,
  skillCount = 0,
  achievementCount = 0,
  onExplore,
  onEdit,
}: {
  fallbackName?: string;
  level?: number;
  lifetimeXp?: number;
  skillCount?: number;
  achievementCount?: number;
  onExplore: () => void;
  onEdit: () => void;
}) {
  const [account, setAccount] = useState<AccountData | null>(null);
  useEffect(() => {
    fetch("/api/v1/account/preferences")
      .then((r) => r.json())
      .then((b) => setAccount(b.data || null))
      .catch(() => {});
  }, []);
  const name = account?.profile.display_name || fallbackName,
    initials = name
      .split(/\s+/)
      .map((v) => v[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  const downloadCard = (format: string) => {
    const anchor = document.createElement("a");
    anchor.href = `/api/v1/share-card?type=character&format=${format}`;
    anchor.download = `skilltree-character-${format}.svg`;
    anchor.click();
  };
  return (
    <>
      <div
        className="profile-hero"
        style={
          {
            "--accent": account?.profile.accent || "#7465e8",
          } as React.CSSProperties
        }
      >
        <div className="profile-avatar">
          {initials}
          <span>{level}</span>
        </div>
        <div>
          <p>CHARACTER PROFILE</p>
          <h2>{name}&apos;s SkillTree</h2>
          <span>Your permanent record of meaningful, real-world progress.</span>
        </div>
        <button className="outline" onClick={onEdit}>
          Edit profile
        </button>
      </div>
      <div className="profile-stats">
        <div>
          <b>{level}</b>
          <span>Character level</span>
        </div>
        <div>
          <b>{lifetimeXp.toLocaleString()}</b>
          <span>Lifetime XP</span>
        </div>
        <div>
          <b>{skillCount}</b>
          <span>Discovered skills</span>
        </div>
        <div>
          <b>{achievementCount}</b>
          <span>Achievements</span>
        </div>
      </div>
      <div className="detail-grid">
        <div className="card">
          <div className="profile-tree">
            <Sparkles />
            <h2>Your character keeps growing</h2>
            <p>
              Goals can change. Every skill, activity, and achievement remains
              part of your story.
            </p>
            <button className="primary" onClick={onExplore}>
              Explore SkillTree
            </button>
          </div>
        </div>
        <div className="card side-card">
          <h2>Share your progress</h2>
          <p>
            Download a privacy-safe card. Evidence, notes, financial values, and
            locations are never included.
          </p>
          <div className="form-actions">
            <button
              className="outline"
              onClick={() => downloadCard("portrait")}
            >
              <Download /> Portrait
            </button>
            <button className="outline" onClick={() => downloadCard("square")}>
              <Download /> Square
            </button>
            <button
              className="outline"
              onClick={() => downloadCard("landscape")}
            >
              <Download /> Landscape
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function LiveSettings() {
  const router=useRouter();
  const [data, setData] = useState<AccountData | null>(null),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState(""),
    [failed, setFailed] = useState(false),[deleteText,setDeleteText]=useState("");
  const load = () => {
    setLoading(true);
    fetch("/api/v1/account/preferences")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((b) => {
        setData(b.data);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    fetch("/api/v1/account/preferences")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((b) => {
        setData(b.data);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);
  const save = async (form: FormData) => {
    const body = {
      display_name: String(form.get("display_name") || ""),
      timezone: String(form.get("timezone") || "UTC"),
      theme: String(form.get("theme") || "system"),
      gamification: String(form.get("gamification") || "balanced"),
      focus_limit: Number(form.get("focus_limit") || 3),
      locale: String(form.get("locale") || "en-GB"),
      celebrations: form.get("celebrations") === "on",
      reduced_motion: form.get("reduced_motion") === "on",
    };
    if(body.timezone!==data?.profile.timezone&&!window.confirm("Changing timezone can move how future due dates, reminders and recurring habits fall on a calendar day. Historical timestamps will not change. Save this timezone change?"))return;
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/v1/account/preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setMessage(
      response.ok ? "Settings saved." : "Your settings could not be saved.",
    );
    if (response.ok) load();
  };
  const saveProfile = async (form: FormData) => {
    setMessage("");
    const response = await fetch("/api/v1/profile/public", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: form.get("slug"),
          visibility: form.get("visibility"),
          bio: form.get("bio"),
          accent: form.get("accent"),
          avatarStyle: form.get("avatarStyle"),
          treeStyle: form.get("treeStyle"),
          profileLayout: form.get("profileLayout"),
        }),
      }),
      body = await response.json().catch(() => null);
    setMessage(
      response.ok
        ? "Profile and appearance saved."
        : body?.error?.message || "Profile could not be saved.",
    );
    if (response.ok) load();
  };
  const download = async () => {
    setMessage("");
    const response = await fetch("/api/v1/account/export", { method: "POST" });
    if (!response.ok) {
      const body = await response.json();
      return setMessage(body.error?.message || "Export could not be prepared.");
    }
    const blob = await response.blob(),
      url = URL.createObjectURL(blob),
      anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `skilltree-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const billing = async (kind: "checkout" | "portal") => {
    const response = await fetch(`/api/v1/billing/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: kind === "checkout" ? JSON.stringify({ plan: "pro" }) : undefined,
      }),
      body = await response.json();
    if (response.ok && body.data?.url) location.href = body.data.url;
    else setMessage(body.error?.message || "Billing is not configured.");
  };
  const deleteAccount=async()=>{setSaving(true);setMessage("");const response=await fetch("/api/v1/account",{method:"DELETE",headers:{"x-delete-confirmation":deleteText}}),body=await response.json().catch(()=>null);if(!response.ok){setSaving(false);setMessage(body?.error?.message||"Account deletion could not be completed.");return}await clearOfflineData();router.replace("/sign-in")};
  if (loading)
    return (
      <div className="empty">
        <LoaderCircle className="spin" />
        <p>Loading your settings…</p>
      </div>
    );
  if (failed || !data)
    return (
      <div className="empty">
        <h2>Settings are unavailable</h2>
        <button className="primary" onClick={load}>
          Try again
        </button>
      </div>
    );
  return (
    <>
      <Message
        text={message}
        error={message.includes("not") || message.includes("could")}
      />
      <div className="detail-grid">
        <div>
          <form className="card side-card real-form" action={save}>
            <h2>Personal preferences</h2>
            <label>
              Display name
              <input
                name="display_name"
                defaultValue={data.profile.display_name}
                maxLength={80}
                required
              />
            </label>
            <label>
              Timezone
              <input
                name="timezone"
                defaultValue={data.profile.timezone}
                required
              />
            </label>
            <div className="form-row">
              <label>
                Theme
                <select name="theme" defaultValue={data.preferences.theme}>
                  <option value="system">Use device setting</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
              <label>
                Game feel
                <select
                  name="gamification"
                  defaultValue={data.preferences.gamification}
                >
                  <option value="full">Full</option>
                  <option value="balanced">Balanced</option>
                  <option value="minimal">Minimal</option>
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                Focus goal limit
                <input
                  name="focus_limit"
                  type="number"
                  min="1"
                  max="10"
                  defaultValue={data.preferences.focus_limit}
                />
              </label>
              <label>
                Language and region
                <select name="locale" defaultValue={data.preferences.locale}>
                  <option value="en-GB">English (United Kingdom)</option>
                  <option value="en-US">English (United States)</option>
                  <option value="en-CA">English (Canada)</option>
                  <option value="en-AU">English (Australia)</option>
                  <option value="en-NZ">English (New Zealand)</option>
                  <option value="en-IE">English (Ireland)</option>
                </select>
              </label>
            </div>
            <small>
              Dates, numbers, currencies and weekly summaries follow this
              region. Interface translations currently use English.
            </small>
            <label>
              <input
                name="celebrations"
                type="checkbox"
                defaultChecked={data.preferences.celebrations}
              />{" "}
              Show celebrations
            </label>
            <label>
              <input
                name="reduced_motion"
                type="checkbox"
                defaultChecked={data.preferences.reduced_motion}
              />{" "}
              Reduce motion
            </label>
            <button className="primary" disabled={saving}>
              {saving ? "Saving…" : "Save preferences"}
            </button>
          </form>
          <form className="card side-card real-form" action={saveProfile}>
            <h2>Profile & appearance</h2>
            <label>
              Bio
              <textarea
                name="bio"
                defaultValue={data.profile.bio || ""}
                maxLength={300}
              />
            </label>
            <div className="form-row">
              <label>
                Public address
                <input
                  name="slug"
                  defaultValue={data.profile.public_slug || ""}
                  placeholder="your-name"
                />
              </label>
              <label>
                Visibility
                <select
                  name="visibility"
                  defaultValue={data.profile.visibility || "private"}
                >
                  <option value="private">Private</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="public">Public</option>
                </select>
              </label>
            </div>
            <label>
              Accent colour
              <input
                name="accent"
                type="color"
                defaultValue={data.profile.accent || "#7465e8"}
              />
            </label>
            <div className="form-row">
              <label>
                Avatar
                <select
                  name="avatarStyle"
                  defaultValue={data.profile.avatar_style || "initials"}
                >
                  <option value="initials">Initials</option>
                  <option value="leaf">Leaf</option>
                  <option value="spark">Spark</option>
                  <option value="orb">Orb</option>
                </select>
              </label>
              <label>
                SkillTree style
                <select
                  name="treeStyle"
                  defaultValue={data.profile.tree_style || "organic"}
                >
                  <option value="organic">Organic</option>
                  <option value="constellation">Constellation</option>
                  <option value="minimal">Minimal</option>
                </select>
              </label>
            </div>
            <label>
              Profile layout
              <select
                name="profileLayout"
                defaultValue={data.profile.profile_layout || "balanced"}
              >
                <option value="balanced">Balanced</option>
                <option value="skills_first">Skills first</option>
                <option value="achievements_first">Achievements first</option>
              </select>
            </label>
            <p>
              Cosmetics change presentation only. They never grant XP, levels,
              or achievements.
            </p>
            <button className="primary">Save profile</button>
          </form>
        </div>
        <div>
          <div className="card side-card">
            <h2>Security and privacy</h2>
            <p>Manage multi-factor authentication and active sessions.</p>
            <Link className="outline" href="/settings/security">
              <ShieldCheck /> Security settings
            </Link>
          </div>
          <div className="card side-card">
            <h2>Your data</h2>
            <p>
              Download a complete, machine-readable copy of your SkillTree
              history.
            </p>
            <button className="outline" onClick={download}>
              <Download /> Export my data
            </button>
          </div>
          <div className="card side-card">
            <h2>SkillTree Pro</h2>
            <p>
              Unlock expanded insights, imports, integrations, and developer
              tools. XP is never sold.
            </p>
            <button className="primary" onClick={() => billing("checkout")}>
              Upgrade to Pro
            </button>
            <button className="outline" onClick={() => billing("portal")}>
              Manage billing <ExternalLink />
            </button>
          </div>
          <div className="card side-card">
            <h2>Feedback and support</h2>
            <p>Report a bug, request a feature, or tell us what feels confusing. Diagnostics are always optional.</p>
            <Link className="outline" href="/support">Send feedback</Link>
          </div>
          <div className="card side-card">
            <h2>Delete account</h2>
            <p>This permanently removes your account and owned SkillTree data. Ledger history, evidence, integrations, and queued offline changes cannot be recovered.</p>
            <label>Type DELETE MY SKILLTREE<input value={deleteText} onChange={event=>setDeleteText(event.target.value)} autoComplete="off"/></label>
            <button className="danger" disabled={saving||deleteText!=="DELETE MY SKILLTREE"} onClick={deleteAccount}>Permanently delete my account</button>
          </div>
        </div>
      </div>
    </>
  );
}
