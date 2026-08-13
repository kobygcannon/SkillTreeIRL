"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Check, Flame, Zap } from "lucide-react";

type Season = { id: string; name: string; starts_at: string; ends_at: string; generatedAt: string; metadata: Record<string, unknown>; stats: { xp_earned: number; activities: number; quests_completed: number; habits_completed: number; updated_at: string } };

export default function LiveSeason() {
  const [season, setSeason] = useState<Season | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const load = () => fetch("/api/v1/seasons/current").then((response) => { if (!response.ok) throw new Error(); return response.json(); }).then((body) => { setSeason(body.data); setFailed(false); }).catch(() => setFailed(true));
  useEffect(() => { fetch("/api/v1/seasons/current").then((response) => { if (!response.ok) throw new Error(); return response.json(); }).then((body) => setSeason(body.data)).catch(() => setFailed(true)); }, []);
  if (failed) return <div className="empty"><h2>Season progress could not be loaded</h2><p>Your lifetime XP and history are unaffected.</p><button className="outline" onClick={load}>Try again</button></div>;
  if (season === undefined) return <div className="empty" aria-busy="true"><h2>Loading current season…</h2></div>;
  if (!season) return <div className="empty"><div><CalendarDays /></div><h2>No season is active</h2><p>Your lifetime character continues growing without seasonal resets.</p></div>;
  const total = Math.max(1, new Date(season.ends_at).getTime() - new Date(season.starts_at).getTime());
  const generatedAt = new Date(season.generatedAt).getTime();
  const elapsed = Math.min(total, Math.max(0, generatedAt - new Date(season.starts_at).getTime()));
  const daysLeft = Math.max(0, Math.ceil((new Date(season.ends_at).getTime() - generatedAt) / 86400000));
  return <><section className="hero"><div><span className="eyebrow"><Zap /> CURRENT SEASON</span><h2>{season.name}</h2><p>A focused chapter of progress. Seasonal totals add context; they never replace lifetime growth.</p><div className="meta"><span><CalendarDays /> {daysLeft} days remaining</span><span><Zap /> {Number(season.stats.xp_earned).toLocaleString()} XP earned</span></div></div><div className="hero-art"><div className="core"><Flame /></div></div></section><div className="stats-row"><div><b>{Number(season.stats.xp_earned).toLocaleString()}</b><small>Season XP</small></div><div><b>{season.stats.activities}</b><small>Activities</small></div><div><b>{season.stats.quests_completed}</b><small>Quests completed</small></div><div><b>{season.stats.habits_completed}</b><small>Habit completions</small></div></div><div className="card side-card"><h3>Season timeline</h3><div className="progress"><i style={{ width: `${elapsed / total * 100}%` }} /></div><p>{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(new Date(season.starts_at))} – {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(season.ends_at))}</p><p><Check /> Everything earned here remains in your permanent SkillTree after the season ends.</p></div></>;
}
