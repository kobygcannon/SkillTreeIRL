"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  Award,
  Bell,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Flame,
  History,
  Home,
  Leaf,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Trophy,
  User,
  X,
  Zap,
} from "lucide-react";
import AuthenticatedQuickAdd from "@/components/authenticated-quick-add";
import {
  LiveAchievements,
  LiveHistory,
  LiveInsights,
} from "@/components/live-pages";
import { LiveProfile, LiveSettings } from "@/components/account-pages";
import FocusSession from "@/components/focus-session";
import CommandPalette from "@/components/command-palette";
import GoalProgressDialog from "@/components/goal-progress-dialog";
import GoalManageDialog from "@/components/goal-manage-dialog";
import LiveGoalContext from "@/components/live-goal-context";
import LiveSkillDetail from "@/components/live-skill-detail";
import LiveSeason from "@/components/live-season";
import LiveCalendar from "@/components/live-calendar";
import { resilientFetch as fetch } from "@/lib/offline/queue";
import { formatCurrency, formatNumber, translate } from "@/lib/i18n";
import MarketingHome from "@/components/marketing-home";
import SuggestedQuests from "@/components/suggested-quests";

export type Page =
  | "today"
  | "goals"
  | "skills"
  | "quests"
  | "habits"
  | "achievements"
  | "history"
  | "insights"
  | "season"
  | "profile"
  | "settings"
  | "calendar";
export type GoalFilter = "active" | "later" | "completed" | "archived";
export type GoalItem = {
  id: string;
  title: string;
  category: string;
  icon: string;
  current: number;
  target: number;
  unit: string;
  status: string;
  color: string;
  deadline: string;
  momentum: string;
  measurement?: string;
  priority?: "focus" | "high" | "normal" | "low" | "later";
};

function goalPercent(goal: GoalItem) {
  return goal.target > 0
    ? Math.max(0, Math.min(100, (goal.current / goal.target) * 100))
    : 0;
}
function goalValue(goal: GoalItem, value: number, locale: string) {
  if (goal.measurement === "currency" && /^[A-Z]{3}$/i.test(goal.unit)) {
    try {
      return formatCurrency(locale, value, goal.unit);
    } catch {}
  }
  return `${formatNumber(locale, value)}${goal.unit ? ` ${goal.unit}` : ""}`;
}
function goalProgressText(goal: GoalItem) {
  if (goal.measurement === "open_ended")
    return goal.current > 0
      ? `${goal.current} progress updates logged`
      : "Developing without a fixed finish line";
  if (goal.measurement === "milestones")
    return "Progress through meaningful milestones";
  if (goal.measurement === "composite")
    return "Progress is calculated from its subgoals";
  if (goal.measurement === "binary")
    return goal.current >= 1 ? "Completed" : "Not completed yet";
  return `${goal.current} of ${goal.target} ${goal.unit}`;
}
export type Quest = {
  id: string;
  title: string;
  goalId: string | null;
  goal: string;
  xp: number;
  due: string;
  done: boolean;
  skill: string;
  status: "planned" | "ready" | "in_progress" | "completed" | "skipped" | "cancelled" | "overdue";
  pinned: boolean;
};
export type Habit = {
  id: string;
  title: string;
  detail: string;
  xp: number;
  done: boolean;
  icon: string;
  due: boolean;
};
export type Skill = {
  id: string;
  name: string;
  category: string;
  level: number;
  xp: number;
  next: number;
  color: string;
  icon: string;
  x: number;
  y: number;
  parent?: string;
  recent?: boolean;
};
export type UserSummary = {
  displayName: string;
  level: number;
  levelPercentage: number;
  remainingXp: number;
  lifetimeXp: number;
  weeklyXp: number;
  skillCount: number;
  achievementCount: number;
  lifetimeActivities: number;
  recommendation?: { title: string; detail: string; goalId?: string };
};

const goalsSeed: GoalItem[] = [
  {
    id: "g1",
    title: "Build & launch SkillTree",
    category: "Business",
    icon: "🚀",
    current: 68,
    target: 100,
    unit: "%",
    status: "Focus",
    color: "#7c6cf2",
    deadline: "30 Sep",
    momentum: "High",
  },
  {
    id: "g2",
    title: "Run a comfortable 10K",
    category: "Health",
    icon: "🏃",
    current: 6.4,
    target: 10,
    unit: "km",
    status: "Focus",
    color: "#e48253",
    deadline: "18 Oct",
    momentum: "Building",
  },
  {
    id: "g3",
    title: "Build an emergency fund",
    category: "Finance",
    icon: "◒",
    current: 4200,
    target: 10000,
    unit: "£",
    status: "Focus",
    color: "#44a77a",
    deadline: "Mar 2027",
    momentum: "Steady",
  },
  {
    id: "g4",
    title: "Read 24 books this year",
    category: "Learning",
    icon: "◫",
    current: 15,
    target: 24,
    unit: "books",
    status: "Active",
    color: "#ca9d42",
    deadline: "31 Dec",
    momentum: "Steady",
  },
];
const questsSeed: Quest[] = [
  {
    id: "q1",
    title: "Polish the onboarding flow",
    goalId: "g1",
    goal: "Build & launch SkillTree",
    xp: 50,
    due: "Today",
    done: false,
    status: "ready",
    pinned: false,
    skill: "Product Design",
  },
  {
    id: "q2",
    title: "Complete an easy 7 km run",
    goalId: "g2",
    goal: "Run a comfortable 10K",
    xp: 50,
    due: "Today",
    done: false,
    status: "ready",
    pinned: false,
    skill: "Running",
  },
  {
    id: "q3",
    title: "Review August spending",
    goalId: "g3",
    goal: "Build an emergency fund",
    xp: 25,
    due: "Tomorrow",
    done: false,
    status: "ready",
    pinned: false,
    skill: "Budgeting",
  },
  {
    id: "q4",
    title: "Finish chapter 8",
    goalId: "g4",
    goal: "Read 24 books this year",
    xp: 10,
    due: "Sat",
    done: false,
    status: "ready",
    pinned: false,
    skill: "Learning",
  },
];
const habitsSeed: Habit[] = [
  {
    id: "h1",
    title: "Read for 20 minutes",
    detail: "Daily",
    xp: 10,
    done: false,
    due: true,
    icon: "◫",
  },
  {
    id: "h2",
    title: "Move for 30 minutes",
    detail: "4× per week",
    xp: 15,
    done: true,
    due: true,
    icon: "◌",
  },
  {
    id: "h3",
    title: "Plan tomorrow",
    detail: "Weekdays",
    xp: 5,
    done: false,
    due: true,
    icon: "◇",
  },
];
const skills: Skill[] = [
  {
    id: "s0",
    name: "Your SkillTree",
    category: "Character",
    level: 18,
    xp: 12480,
    next: 13900,
    color: "#7c6cf2",
    icon: "✦",
    x: 50,
    y: 9,
  },
  {
    id: "s1",
    name: "Technology",
    category: "Domain",
    level: 14,
    xp: 4120,
    next: 4900,
    color: "#7164e7",
    icon: "⌘",
    x: 25,
    y: 28,
    parent: "s0",
    recent: true,
  },
  {
    id: "s2",
    name: "Health",
    category: "Domain",
    level: 11,
    xp: 2840,
    next: 3400,
    color: "#d77a4b",
    icon: "♥",
    x: 75,
    y: 28,
    parent: "s0",
    recent: true,
  },
  {
    id: "s3",
    name: "Product Design",
    category: "Technology",
    level: 12,
    xp: 3220,
    next: 3760,
    color: "#8b76ed",
    icon: "◇",
    x: 12,
    y: 52,
    parent: "s1",
    recent: true,
  },
  {
    id: "s4",
    name: "Software Dev",
    category: "Technology",
    level: 17,
    xp: 5900,
    next: 6650,
    color: "#5c73da",
    icon: "</>",
    x: 36,
    y: 52,
    parent: "s1",
  },
  {
    id: "s5",
    name: "Running",
    category: "Health",
    level: 9,
    xp: 1910,
    next: 2300,
    color: "#e48253",
    icon: "↗",
    x: 64,
    y: 52,
    parent: "s2",
    recent: true,
  },
  {
    id: "s6",
    name: "Wellbeing",
    category: "Health",
    level: 7,
    xp: 1120,
    next: 1450,
    color: "#e0a05f",
    icon: "◌",
    x: 88,
    y: 52,
    parent: "s2",
  },
  {
    id: "s7",
    name: "Finance",
    category: "Domain",
    level: 10,
    xp: 2310,
    next: 2800,
    color: "#44a77a",
    icon: "£",
    x: 32,
    y: 77,
    parent: "s0",
    recent: true,
  },
  {
    id: "s8",
    name: "Learning",
    category: "Domain",
    level: 13,
    xp: 3720,
    next: 4300,
    color: "#ca9d42",
    icon: "◫",
    x: 68,
    y: 77,
    parent: "s0",
  },
];

const nav = [
  ["today", "nav.today", Home],
  ["goals", "nav.goals", Target],
  ["skills", "nav.skills", Sparkles],
  ["quests", "nav.quests", Swords],
  ["habits", "nav.habits", CalendarDays],
  ["calendar", "nav.calendar", CalendarDays],
  ["achievements", "nav.achievements", Trophy],
  ["history", "nav.history", History],
  ["insights", "nav.insights", BarChart3],
] as const;

function Progress({
  value,
  color = "#7c6cf2",
}: {
  value: number;
  color?: string;
}) {
  return (
    <div className="progress">
      <i style={{ width: `${Math.min(100, value)}%`, background: color }} />
    </div>
  );
}
function Ring({
  value,
  color,
  size = 48,
}: {
  value: number;
  color: string;
  size?: number;
}) {
  return (
    <div
      className="ring"
      style={
        {
          "--p": `${value * 3.6}deg`,
          "--c": color,
          width: size,
          height: size,
        } as React.CSSProperties
      }
    >
      <span>{Math.round(value)}%</span>
    </div>
  );
}
function Logo() {
  return (
    <div className="logo">
      <span>
        <Leaf size={18} />
      </span>
      <b>SkillTree</b>
      <em>IRL</em>
    </div>
  );
}

export function SkillTreeApp({
  initialGoals,
  initialQuests,
  initialHabits,
  initialSkills,
  authenticated = false,
  userSummary,
  initialPage = "today",
  locale = "en-GB",
  initialGoalFilter = "active",
  initialTheme = "system",
}: {
  initialGoals?: GoalItem[];
  initialQuests?: Quest[];
  initialHabits?: Habit[];
  initialSkills?: Skill[];
  authenticated?: boolean;
  userSummary?: UserSummary;
  initialPage?: Page;
  locale?: string;
  initialGoalFilter?: GoalFilter;
  initialTheme?: "system" | "light" | "dark";
}) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [page, setPage] = useState<Page>(initialPage);
  const [goals, setGoals] = useState(initialGoals || goalsSeed);
  const [quests, setQuests] = useState<Quest[]>(() => {
    if (initialQuests) return initialQuests;
    return questsSeed;
  });
  const [habits, setHabits] = useState<Habit[]>(() => {
    if (initialHabits) return initialHabits;
    return habitsSeed;
  });
  const [add, setAdd] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<GoalItem | null>(null);
  const [progressGoal, setProgressGoal] = useState<GoalItem | null>(null);
  const [manageGoal, setManageGoal] = useState<GoalItem | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [dark, setDark] = useState(initialTheme === "dark");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [skillOverrides, setSkillOverrides] = useState<Skill[] | null>(null);
  const skillList =
    skillOverrides ?? (authenticated ? initialSkills || [] : skills);
  const [focus, setFocus] = useState<{
    id: string;
    title: string;
    startedAt: string;
  } | null>(null);
  const [demoConversion, setDemoConversion] = useState(false);
  useEffect(() => {
    if (initialTheme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)"),
      sync = () => setDark(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [initialTheme]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      } else if (event.key.toLowerCase() === "c") {
        event.preventDefault();
        setAdd(true);
      } else if (event.key === "Escape") {
        setSearchOpen(false);
        setAdd(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const toast = (m: string) => {
    setNotice(m);
    setTimeout(() => setNotice(""), 2600);
  };
  const requireAccount = () => {
    setAdd(false);
    setDemoConversion(true);
  };
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    if (authenticated)
      fetch("/api/v1/account/preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ theme: next ? "dark" : "light" }),
      }).then((response) => {
        if (!response.ok) {
          setDark(!next);
          toast("Theme preference could not be saved.");
        }
      });
  };
  const completeQuest = async (id: string) => {
    const q = quests.find((x) => x.id === id);
    if (!q || q.done) return;
    if (!authenticated) {
      requireAccount();
      return;
    }
    setQuests((v) =>
      v.map((item) => (item.id === id ? { ...item, done: true, status: "completed", pinned: false } : item)),
    );
    if (authenticated) {
      const response = await fetch(`/api/v1/quests/${id}/complete`, {
        method: "POST",
        headers: { "idempotency-key": crypto.randomUUID() },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setQuests((v) =>
          v.map((item) => (item.id === id ? { ...item, done: false, status: q.status } : item)),
        );
        if (body?.error?.code === "EVIDENCE_REQUIRED") {
          setAdd(true);
          toast(
            "This quest needs evidence. Choose Complete quest in Quick Add to attach it privately.",
          );
          return;
        }
        toast("Quest could not be completed. Nothing was awarded.");
        return;
      }
      const pending = response.headers.get("x-skilltree-offline") === "queued";
      if (pending) {
        toast("Quest saved offline · XP pending sync.");
        return;
      }
      router.refresh();
    }
    toast(`Quest complete · +${q.xp} XP in ${q.skill}`);
  };
  const completeHabit = async (id: string) => {
    const h = habits.find((x) => x.id === id);
    if (!h || h.done) return;
    if (!authenticated) {
      requireAccount();
      return;
    }
    setHabits((v) =>
      v.map((item) => (item.id === id ? { ...item, done: true } : item)),
    );
    if (authenticated) {
      const localDate = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      const response = await fetch(`/api/v1/habits/${id}/occurrences`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({ localDate, status: "complete" }),
      });
      if (!response.ok) {
        setHabits((v) =>
          v.map((item) => (item.id === id ? { ...item, done: false } : item)),
        );
        toast("Habit could not be logged. Nothing was awarded.");
        return;
      }
      const pending = response.headers.get("x-skilltree-offline") === "queued";
      if (pending) {
        toast("Habit saved offline · XP pending sync.");
        return;
      }
      router.refresh();
    }
    toast(`Habit logged · +${h.xp} XP`);
  };
  const startFocus = async (id: string) => {
    const quest = quests.find((q) => q.id === id);
    if (!quest) return;
    if (!authenticated) {
      requireAccount();
      return;
    }
    if (!navigator.onLine) {
      toast(
        "Focus sessions need a connection so their timer and evidence stay authoritative.",
      );
      return;
    }
    const response = await globalThis.fetch("/api/v1/focus-sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({ questId: id, plannedMinutes: 25 }),
      }),
      body = await response.json();
    if (!response.ok) {
      toast(body.error?.message || "Focus session could not start.");
      return;
    }
    setFocus({
      id: body.data.id,
      title: quest.title,
      startedAt: body.data.started_at,
    });
  };
  const go = (p: Page) => {
    setPage(p);
    if (authenticated)
      router.replace(p === "today" ? "/app" : `/app?view=${p}`, {
        scroll: false,
      });
    setSelectedGoal(null);
    setSelectedSkill(null);
    setMobileMenu(false);
  };
  const title = selectedGoal
    ? selectedGoal.title
    : selectedSkill
      ? selectedSkill.name
      : (
          {
            today: translate(locale, "nav.today"),
            goals: translate(locale, "nav.goals"),
            skills: translate(locale, "page.skills"),
            quests: translate(locale, "nav.quests"),
            habits: translate(locale, "nav.habits"),
            achievements: translate(locale, "nav.achievements"),
            history: translate(locale, "nav.history"),
            insights: translate(locale, "nav.insights"),
            season: translate(locale, "page.season"),
            profile: translate(locale, "page.profile"),
            settings: translate(locale, "nav.settings"),
            calendar: translate(locale, "page.calendar"),
          } as Record<Page, string>
        )[page];
  return (
    <div className={dark ? "app dark" : "app"}>
      <aside className={mobileMenu ? "sidebar open" : "sidebar"}>
        <Logo />
        <button
          className="close-menu"
          onClick={() => setMobileMenu(false)}
          aria-label="Close navigation"
        >
          <X />
        </button>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              className={
                page === id && !selectedGoal && !selectedSkill ? "active" : ""
              }
              onClick={() => go(id)}
            >
              <Icon size={19} />
              <span>{translate(locale, label)}</span>
              {id === "quests" && (
                <small>{quests.filter((q) => !q.done).length}</small>
              )}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <button onClick={() => go("season")}>
            <Zap size={19} />
            <span>{translate(locale, "nav.season")}</span>
          </button>
          <button onClick={() => go("profile")}>
            <User size={19} />
            <span>{translate(locale, "nav.profile")}</span>
          </button>
          {authenticated && (
            <>
              <button onClick={() => router.push("/community")}>
                <Swords size={19} />
                <span>{translate(locale, "nav.community")}</span>
              </button>
              <button onClick={() => router.push("/tools")}>
                <BookOpen size={19} />
                <span>{translate(locale, "nav.tools")}</span>
              </button>
              <button onClick={() => router.push("/templates")}>
                <Leaf size={19} />
                <span>{translate(locale, "nav.templates")}</span>
              </button>
              <button onClick={() => router.push("/referrals")}>
                <User size={19} />
                <span>{translate(locale, "nav.referrals")}</span>
              </button>
            </>
          )}
          <button onClick={() => go("settings")}>
            <Settings size={19} />
            <span>{translate(locale, "nav.settings")}</span>
          </button>
          {authenticated && (
            <button onClick={() => router.push("/settings/notifications")}>
              <Bell size={19} />
              <span>{translate(locale, "nav.notifications")}</span>
            </button>
          )}
          {authenticated && (
            <button onClick={() => router.push("/support")}>
              <BookOpen size={19} />
              <span>{translate(locale, "nav.support")}</span>
            </button>
          )}
          <div className="account">
            <div>
              {(userSummary?.displayName ?? "Koby")
                .split(/\s+/)
                .map((v) => v[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <span>
              <b>{userSummary?.displayName ?? "Koby"}</b>
              <small>
                Level {userSummary?.level ?? 18} ·{" "}
                {(userSummary?.lifetimeXp ?? 12480).toLocaleString(locale)} XP
              </small>
            </span>
            <MoreHorizontal size={18} />
          </div>
        </div>
      </aside>
      <main>
        <header>
          <button
            className="menu-btn"
            onClick={() => setMobileMenu(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </button>
          <div>
            <p>
              {selectedGoal || selectedSkill ? (
                <button
                  className="crumb"
                  onClick={() => {
                    setSelectedGoal(null);
                    setSelectedSkill(null);
                  }}
                >
                  ← Back
                </button>
              ) : (
                new Intl.DateTimeFormat("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                }).format(new Date())
              )}
            </p>
            <h1>{title}</h1>
          </div>
          <div className="head-actions">
            <button
              className="icon-btn"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={19} />
            </button>
            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label="Theme"
            >
              <Moon size={18} />
            </button>
            <button className="add-btn" onClick={() => setAdd(true)}>
              <Plus size={19} /> Add
            </button>
            <div className="avatar">
              {(userSummary?.displayName ?? "Koby")
                .split(/\s+/)
                .map((v) => v[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
              <i />
            </div>
          </div>
        </header>
        <div className="content">
          {selectedGoal ? (
            <GoalDetail
              goal={selectedGoal}
              quests={quests}
              onQuest={completeQuest}
              onProgress={() =>
                authenticated ? setProgressGoal(selectedGoal) : requireAccount()
              }
              onEdit={() =>
                authenticated ? setManageGoal(selectedGoal) : requireAccount()
              }
              authenticated={authenticated}
              locale={locale}
            />
          ) : selectedSkill ? (
            authenticated ? (
              <LiveSkillDetail
                skill={selectedSkill}
                notify={toast}
                onChanged={(updated) => {
                  setSkillOverrides((overrides) => {
                    const items =
                      overrides ?? (authenticated ? initialSkills || [] : skills);
                    return updated
                      ? items.map((item) =>
                          item.id === updated.id ? updated : item,
                        )
                      : items.filter((item) => item.id !== selectedSkill.id);
                  });
                  setSelectedSkill(updated);
                }}
              />
            ) : (
              <SkillDetail skill={selectedSkill} />
            )
          ) : page === "today" ? (
            <Today
              goals={goals}
              quests={quests}
              habits={habits.filter((habit) => habit.due)}
              userSummary={userSummary}
              onGoal={setSelectedGoal}
              onQuest={completeQuest}
              onHabit={completeHabit}
              onFocus={startFocus}
              onAdd={() => setAdd(true)}
              authenticated={authenticated}
            />
          ) : page === "goals" ? (
            <Goals
              goals={goals}
              onGoal={setSelectedGoal}
              onAdd={() => setAdd(true)}
              locale={locale}
              authenticated={authenticated}
              initialFilter={initialGoalFilter}
            />
          ) : page === "skills" ? (
            <Skills
              skillList={skillList}
              onSkill={setSelectedSkill}
              onAdd={() => setAdd(true)}
            />
          ) : page === "quests" ? (
            <Quests
              quests={quests}
              onQuest={completeQuest}
              onAdd={() => setAdd(true)}
              authenticated={authenticated}
            />
          ) : page === "habits" ? (
            <Habits
              habits={habits}
              onHabit={completeHabit}
              onAdd={() => setAdd(true)}
              authenticated={authenticated}
            />
          ) : page === "achievements" ? (
            authenticated ? (
              <LiveAchievements />
            ) : (
              <Achievements />
            )
          ) : page === "history" ? (
            authenticated ? (
              <LiveHistory locale={locale} />
            ) : (
              <HistoryPage />
            )
          ) : page === "insights" ? (
            authenticated ? (
              <LiveInsights />
            ) : (
              <Insights />
            )
          ) : page === "profile" ? (
            authenticated ? (
              <LiveProfile
                fallbackName={userSummary?.displayName}
                level={userSummary?.level}
                lifetimeXp={userSummary?.lifetimeXp}
                skillCount={userSummary?.skillCount}
                achievementCount={userSummary?.achievementCount}
                onExplore={() => go("skills")}
                onEdit={() => go("settings")}
              />
            ) : (
              <Profile />
            )
          ) : page === "calendar" && authenticated ? (
            <LiveCalendar />
          ) : page === "settings" && authenticated ? (
            <LiveSettings />
          ) : page === "season" && authenticated ? (
            <LiveSeason />
          ) : (
            <Generic page={page} onExplore={requireAccount} />
          )}
        </div>
      </main>
      <div className="mobile-nav">
        <button
          onClick={() => go("today")}
          className={page === "today" ? "active" : ""}
        >
          <Home />
          <span>Today</span>
        </button>
        <button
          onClick={() => go("goals")}
          className={page === "goals" ? "active" : ""}
        >
          <Target />
          <span>Goals</span>
        </button>
        <button
          className="mobile-add"
          onClick={() => setAdd(true)}
          aria-label="Quick add"
        >
          <Plus />
        </button>
        <button
          onClick={() => go("skills")}
          className={page === "skills" ? "active" : ""}
        >
          <Sparkles />
          <span>Skills</span>
        </button>
        <button
          onClick={() => go("profile")}
          className={page === "profile" ? "active" : ""}
        >
          <User />
          <span>You</span>
        </button>
      </div>
      {add &&
        (authenticated ? (
          <AuthenticatedQuickAdd
            close={() => setAdd(false)}
            onSuccess={toast}
          />
        ) : (
          <DemoConversion close={() => setAdd(false)} />
        ))}{" "}
      {demoConversion && (
        <DemoConversion close={() => setDemoConversion(false)} />
      )}{" "}
      {searchOpen && (
        <CommandPalette
          close={() => setSearchOpen(false)}
          onQuickAdd={() => {
            setSearchOpen(false);
            setAdd(true);
          }}
          onSelect={(result) => {
            setSearchOpen(false);
            const path =
              result.type === "achievement"
                ? null
                : result.type === "journal"
                  ? `/journal/${result.id}`
                  : `/${result.type}s/${result.id}`;
            if (path) {
              router.push(path);
              return;
            }
            go("achievements");
          }}
        />
      )}{" "}
      {focus && (
        <FocusSession
          {...focus}
          onClose={() => setFocus(null)}
          onDone={toast}
        />
      )}{" "}
      {progressGoal && (
        <GoalProgressDialog
          goal={progressGoal}
          close={() => setProgressGoal(null)}
          onSaved={(value) => {
            const updated = { ...progressGoal, current: value };
            setGoals((items) =>
              items.map((goal) => (goal.id === updated.id ? updated : goal)),
            );
            setSelectedGoal(updated);
            router.refresh();
            toast("Goal progress saved");
          }}
        />
      )}{" "}
      {manageGoal && (
        <GoalManageDialog
          goal={manageGoal}
          close={() => setManageGoal(null)}
          onSaved={(updated) => {
            setGoals((items) =>
              updated
                ? items.map((goal) => (goal.id === updated.id ? updated : goal))
                : items.filter((goal) => goal.id !== manageGoal.id),
            );
            setSelectedGoal(updated);
            router.refresh();
            toast(
              updated ? "Goal updated" : "Goal moved out of your active list",
            );
          }}
        />
      )}{" "}
      {notice && (
        <div className="toast">
          <Check size={18} />
          {notice}
        </div>
      )}
      {mobileMenu && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}
    </div>
  );
}
export default function DemoApp() {
  return <MarketingHome />;
}

function Today({
  goals,
  quests,
  habits,
  userSummary,
  onGoal,
  onQuest,
  onHabit,
  onFocus,
  onAdd,
  authenticated,
}: {
  goals: GoalItem[];
  quests: Quest[];
  habits: Habit[];
  userSummary?: UserSummary;
  onGoal: (g: GoalItem) => void;
  onQuest: (id: string) => void;
  onHabit: (id: string) => void;
  onFocus: (id: string) => void;
  onAdd: () => void;
  authenticated: boolean;
}) {
  const nextQuest = quests.find((q) => q.pinned || ["ready", "in_progress", "overdue"].includes(q.status));
  const character = userSummary ?? {
    displayName: "Koby",
    level: 18,
    levelPercentage: 66,
    remainingXp: 1420,
    lifetimeXp: 12480,
    weeklyXp: 385,
    skillCount: 16,
    achievementCount: 12,
    lifetimeActivities: 74,
  };
  const done =
    quests.filter((q) => q.done).length + habits.filter((h) => h.done).length;
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">
            <Sparkles size={14} /> YOUR NEXT BEST ACTION
          </span>
          <h2>
            {nextQuest?.title ||
              character.recommendation?.title ||
              "Log one meaningful step"}
          </h2>
          <p>
            {nextQuest
              ? "A small, concrete action keeps your momentum honest."
              : character.recommendation?.detail ||
                "Your plan is clear. Capture useful effort as it happens."}
          </p>
          <div className="meta">
            {nextQuest ? (
              <>
                <span>
                  <Target size={15} /> {nextQuest.goal}
                </span>
                <span>
                  <CalendarDays size={15} /> {nextQuest.due}
                </span>
                <span>
                  <Zap size={15} /> {nextQuest.xp} XP
                </span>
              </>
            ) : (
              <span>
                <Activity size={15} /> Your progress remains private by default
              </span>
            )}
          </div>
          {nextQuest ? (
            <>
              <button onClick={() => onQuest(nextQuest.id)} className="primary">
                <Check size={18} /> Mark complete
              </button>
              <button onClick={() => onFocus(nextQuest.id)} className="quiet">
                Start focus session
              </button>
            </>
          ) : (
            <button
              onClick={() =>
                character.recommendation?.goalId
                  ? onGoal(
                      goals.find(
                        (goal) => goal.id === character.recommendation?.goalId,
                      )!,
                    )
                  : onAdd()
              }
              className="primary"
            >
              <Plus size={18} />{" "}
              {character.recommendation?.goalId
                ? "Review goal"
                : "Log activity"}
            </button>
          )}
        </div>
        <div className="hero-art">
          <div className="orbit o1" />
          <div className="orbit o2" />
          <div className="core">
            <Sparkles />
          </div>
          <span className="node n1">DO</span>
          <span className="node n2">LEARN</span>
          <span className="node n3">GROW</span>
        </div>
      </section>
      {authenticated && <SuggestedQuests />}
      <div className="today-grid">
        <div>
          <SectionHead title="Focus goals" action="View all" />
          <div className="goal-list">
            {goals
              .filter((g) => ["Focus", "Active"].includes(g.status))
              .slice(0, 3)
              .map((g) => (
                <button
                  className="goal-row"
                  key={g.id}
                  onClick={() => onGoal(g)}
                >
                  <span
                    className="goal-icon"
                    style={{ background: g.color + "18", color: g.color }}
                  >
                    {g.icon}
                  </span>
                  <span className="goal-info">
                    <b>{g.title}</b>
                    <small>{goalProgressText(g)}</small>
                    {g.target > 0 && (
                      <Progress value={goalPercent(g)} color={g.color} />
                    )}
                  </span>
                  <Ring value={goalPercent(g)} color={g.color} />
                  <ChevronRight size={18} />
                </button>
              ))}
          </div>
        </div>
        <div>
          <SectionHead
            title="Today"
            action={`${done}/${quests.slice(0, 2).length + habits.length} done`}
          />
          <div className="task-card">
            {quests.slice(0, 2).map((q) => (
              <Task
                key={q.id}
                done={q.done}
                title={q.title}
                sub={`${q.goal} · +${q.xp} XP`}
                onClick={() => onQuest(q.id)}
              />
            ))}
            <div className="divider" />
            {habits.map((h) => (
              <Task
                key={h.id}
                done={h.done}
                title={h.title}
                sub={`${h.detail} · +${h.xp} XP`}
                onClick={() => onHabit(h.id)}
                habit
              />
            ))}
            <button className="log-link" onClick={onAdd}>
              <Plus size={16} /> Log another activity
            </button>
          </div>
        </div>
      </div>
      <div className="bottom-grid">
        <div className="card momentum">
          <SectionHead title="Your momentum" action="Last 14 days" />
          <div className="momentum-body">
            <div className="momentum-ring">
              <Flame size={27} />
              <b>{character.weeklyXp > 0 ? "Building" : "Ready"}</b>
              <small>momentum</small>
            </div>
            <div>
              <h3>
                {character.lifetimeActivities} meaningful action
                {character.lifetimeActivities === 1 ? "" : "s"}
              </h3>
              <p>
                {character.weeklyXp > 0
                  ? `You earned ${character.weeklyXp.toLocaleString()} XP this week. Keep choosing useful next actions.`
                  : "Your SkillTree is ready. Log one meaningful action to start building momentum."}
              </p>
            </div>
          </div>
        </div>
        <div className="card xp-card">
          <SectionHead title="Character progress" action="View profile" />
          <div className="level">
            <span>{character.level}</span>
            <div>
              <b>Level {character.level}</b>
              <small>
                {character.remainingXp.toLocaleString()} XP to Level{" "}
                {character.level + 1}
              </small>
              <Progress value={character.levelPercentage} />
            </div>
          </div>
          <div className="stats">
            <div>
              <b>{character.weeklyXp.toLocaleString()}</b>
              <small>XP this week</small>
            </div>
            <div>
              <b>{character.lifetimeXp.toLocaleString()}</b>
              <small>Lifetime XP</small>
            </div>
            <div>
              <b>{character.skillCount}</b>
              <small>Skills discovered</small>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
function SectionHead({ title, action }: { title: string; action: string }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      <span className="section-context">{action}</span>
    </div>
  );
}
function Task({
  done,
  title,
  sub,
  onClick,
  habit,
}: {
  done: boolean;
  title: string;
  sub: string;
  onClick: () => void;
  habit?: boolean;
}) {
  return (
    <button className={done ? "task done" : "task"} onClick={onClick}>
      <span className="check">{done && <Check size={15} />}</span>
      <span>
        <b>{title}</b>
        <small>{sub}</small>
      </span>
      {habit ? (
        <span className="habit-tag">Habit</span>
      ) : (
        <ChevronRight size={17} />
      )}
    </button>
  );
}

function Goals({
  goals,
  onGoal,
  onAdd,
  locale,
  authenticated,
  initialFilter,
}: {
  goals: GoalItem[];
  onGoal: (g: GoalItem) => void;
  onAdd: () => void;
  locale: string;
  authenticated: boolean;
  initialFilter: GoalFilter;
}) {
  const router = useRouter(),
    [filter, setFilter] = useState<GoalFilter>(initialFilter),
    groups = {
      active: goals.filter((goal) =>
        ["Active", "Focus", "Paused", "Draft"].includes(goal.status),
      ),
      later: goals.filter((goal) => goal.status === "Later"),
      completed: goals.filter((goal) => goal.status === "Completed"),
      archived: goals.filter((goal) =>
        ["Archived", "Abandoned"].includes(goal.status),
      ),
    },
    visible = groups[filter];
  const choose = (value: typeof filter) => {
    setFilter(value);
    if (authenticated)
      router.replace(`/app?view=goals&filter=${value}`, { scroll: false });
  };
  return (
    <>
      <div className="toolbar">
        <div className="tabs">
          <button
            className={filter === "active" ? "active" : ""}
            onClick={() => choose("active")}
          >
            Active <span>{groups.active.length}</span>
          </button>
          <button
            className={filter === "later" ? "active" : ""}
            onClick={() => choose("later")}
          >
            Later <span>{groups.later.length}</span>
          </button>
          <button
            className={filter === "completed" ? "active" : ""}
            onClick={() => choose("completed")}
          >
            Completed <span>{groups.completed.length}</span>
          </button>
          <button
            className={filter === "archived" ? "active" : ""}
            onClick={() => choose("archived")}
          >
            Archive <span>{groups.archived.length}</span>
          </button>
        </div>
        <button className="primary" onClick={onAdd}>
          <Plus size={17} /> New goal
        </button>
      </div>
      <div className="goal-grid">
        {visible.map((g) => (
          <button className="goal-card" key={g.id} onClick={() => onGoal(g)}>
            <div className="goal-top">
              <span
                className="goal-icon big"
                style={{ background: g.color + "18", color: g.color }}
              >
                {g.icon}
              </span>
              <span className={g.status === "Focus" ? "pill focus" : "pill"}>
                {g.status}
              </span>
              <MoreHorizontal />
            </div>
            <p>{g.category}</p>
            <h2>{g.title}</h2>
            <div className="goal-number">
              <b>{goalValue(g, g.current, locale)}</b>
              {g.target > 0 && <span> / {goalValue(g, g.target, locale)}</span>}
            </div>
            {g.target > 0 ? (
              <Progress value={goalPercent(g)} color={g.color} />
            ) : (
              <p>{goalProgressText(g)}</p>
            )}
            <div className="goal-foot">
              <span>
                <Flame size={15} />
                {g.momentum}
              </span>
              <span>
                <CalendarDays size={15} />
                {g.deadline}
              </span>
            </div>
          </button>
        ))}
        {!visible.length && (
          <div className="empty">
            <div>
              <Target />
            </div>
            <h2>No {filter} goals</h2>
            <p>Your goals will appear here when they enter this stage.</p>
          </div>
        )}
      </div>
      <div className="gentle">
        <Leaf />
        <div>
          <b>Keep your focus narrow</b>
          <p>
            Three focus goals is a healthy limit. Other goals can stay active
            without competing for Today.
          </p>
        </div>
      </div>
    </>
  );
}
function GoalDetail({
  goal,
  quests,
  onQuest,
  onProgress,
  onEdit,
  authenticated,
  locale,
}: {
  goal: GoalItem;
  quests: Quest[];
  onQuest: (id: string) => void;
  onProgress: () => void;
  onEdit: () => void;
  authenticated: boolean;
  locale: string;
}) {
  const pct = goalPercent(goal);
  const goalQuests = quests.filter((quest) => quest.goalId === goal.id).slice(0, 3);
  return (
    <>
      <div className="detail-head">
        <span
          className="goal-icon huge"
          style={{ background: goal.color + "18", color: goal.color }}
        >
          {goal.icon}
        </span>
        <div>
          <p>
            {goal.category} · <span className="pill focus">{goal.status}</span>
          </p>
          <h2>{goal.title}</h2>
          <span>
            <CalendarDays size={15} /> Target {goal.deadline}
          </span>
        </div>
        <button className="outline" onClick={onEdit}>
          Edit goal
        </button>
      </div>
      <div className="detail-grid">
        <div>
          <div className="card progress-card">
            <div className="big-ring">
              <Ring value={pct} color={goal.color} size={142} />
            </div>
            <div>
              <span className="eyebrow">CURRENT PROGRESS</span>
              <h2>
                {goalValue(goal, goal.current, locale)}{" "}
                {goal.target > 0 && (
                  <small>of {goalValue(goal, goal.target, locale)}</small>
                )}
              </h2>
              <p>
                {goal.target > 0
                  ? `You’ve moved ${Math.round(pct)}% of the way. Momentum is ${goal.momentum.toLowerCase()}.`
                  : goalProgressText(goal)}
              </p>
              <button className="primary" onClick={onProgress}>
                <Plus size={17} /> Add progress
              </button>
            </div>
          </div>
          <SectionHead title="Next actions" action="View plan" />
          <div className="task-card">
            {goalQuests.map((q) => (
              <Task
                key={q.id}
                done={q.done}
                title={q.title}
                sub={`+${q.xp} XP · ${q.due}`}
                onClick={() => onQuest(q.id)}
              />
            ))}
            {!goalQuests.length && (
              <p className="modal-tip">No next actions are linked to this goal yet.</p>
            )}
          </div>
        </div>
        {authenticated ? (
          <div>
            <LiveGoalContext goalId={goal.id} />
          </div>
        ) : (
          <div>
            <div className="card side-card">
              <h3>Linked skills</h3>
              {skills.slice(3, 6).map((s) => (
                <div className="linked" key={s.id}>
                  <span style={{ background: s.color + "20", color: s.color }}>
                    {s.icon}
                  </span>
                  <div>
                    <b>{s.name}</b>
                    <small>Level {s.level}</small>
                  </div>
                  <em>+{s.recent ? "125" : "40"} XP</em>
                </div>
              ))}
            </div>
            <div className="card side-card">
              <h3>Momentum</h3>
              <div className="momentum-label">
                <Flame />
                <div>
                  <b>{goal.momentum}</b>
                  <small>4 updates in 14 days</small>
                </div>
              </div>
              <div className="mini-chart">
                {[30, 46, 38, 62, 52, 79, 73, 91].map((v, i) => (
                  <i key={i} style={{ height: v + "%" }} />
                ))}
              </div>
            </div>
            <div className="card side-card">
              <h3>Recent activity</h3>
              <p className="timeline-line">
                <i />
                Completed “Map core journey”<small>Yesterday · +50 XP</small>
              </p>
              <p className="timeline-line">
                <i />
                Progress updated to {goal.current}
                {goal.unit}
                <small>3 days ago</small>
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Skills({
  onSkill,
  skillList,
  onAdd,
}: {
  onSkill: (s: Skill) => void;
  skillList: Skill[];
  onAdd: () => void;
}) {
  const [query, setQuery] = useState(""),
    [view, setView] = useState<"tree" | "compact">(() =>
      skillList.length > 40 ? "compact" : "tree",
    ),
    [page, setPage] = useState(0),
    pageSize = 100;
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return term
      ? skillList.filter((skill) =>
          `${skill.name} ${skill.category}`.toLocaleLowerCase().includes(term),
        )
      : skillList;
  }, [query, skillList]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize)),
    visible =
      view === "compact"
        ? filtered.slice(page * pageSize, (page + 1) * pageSize)
        : filtered.slice(0, 40);
  return (
    <>
      <div className="skill-toolbar">
        <div className="search">
          <Search size={17} />
          <input
            aria-label="Search your skills"
            placeholder="Search your skills"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
          />
        </div>
        <div className="seg">
          <button
            className={view === "tree" ? "active" : ""}
            onClick={() => {
              setView("tree");
              setPage(0);
            }}
          >
            Tree
          </button>
          <button
            className={view === "compact" ? "active" : ""}
            onClick={() => {
              setView("compact");
              setPage(0);
            }}
          >
            Compact
          </button>
        </div>
        <button className="outline" onClick={onAdd}>
          <Plus size={16} /> Add skill
        </button>
      </div>
      {skillList.length === 0 ? (
        <div className="empty">
          <div>
            <Sparkles />
          </div>
          <h2>Your first skill branch will appear here</h2>
          <p>
            Create a skill or link one while logging an activity. Skills persist
            even when goals change.
          </p>
        </div>
      ) : view === "compact" ? (
        <>
          <div
            className="skill-compact"
            aria-label={`${filtered.length} skills`}
          >
            {visible.map((skill) => (
              <button
                className="card compact-skill"
                key={skill.id}
                onClick={() => onSkill(skill)}
              >
                <span
                  style={{ background: skill.color + "20", color: skill.color }}
                >
                  {skill.icon}
                </span>
                <span>
                  <b>{skill.name}</b>
                  <small>
                    {skill.category} · Level {skill.level}
                  </small>
                  <Progress
                    value={(skill.xp / skill.next) * 100}
                    color={skill.color}
                  />
                </span>
                <ChevronRight />
              </button>
            ))}
          </div>
          {filtered.length > pageSize && (
            <nav className="pagination" aria-label="Skill pages">
              <button
                className="outline"
                disabled={page === 0}
                onClick={() => setPage((value) => Math.max(0, value - 1))}
              >
                Previous
              </button>
              <span>
                Page {page + 1} of {pageCount} · {filtered.length} skills
              </span>
              <button
                className="outline"
                disabled={page + 1 >= pageCount}
                onClick={() =>
                  setPage((value) => Math.min(pageCount - 1, value + 1))
                }
              >
                Next
              </button>
            </nav>
          )}
        </>
      ) : (
        <>
          <div className="tree card">
            <div className="tree-bg" />
            {visible.map(
              (s) =>
                s.parent &&
                visible.find((p) => p.id === s.parent) && (
                  <div
                    key={s.id + "line"}
                    className="branch"
                    style={branchStyle(
                      visible.find((p) => p.id === s.parent)!,
                      s,
                    )}
                  />
                ),
            )}
            {visible.map((s) => (
              <button
                key={s.id}
                className="skill-node"
                style={
                  {
                    left: s.x + "%",
                    top: s.y + "%",
                    "--node": s.color,
                  } as React.CSSProperties
                }
                onClick={() => onSkill(s)}
              >
                <span>{s.icon}</span>
                <div>
                  <b>{s.name}</b>
                  <small>Level {s.level}</small>
                  <Progress value={(s.xp / s.next) * 100} color={s.color} />
                </div>
                {s.recent && <i />}
              </button>
            ))}
            <div className="tree-legend">
              <span>
                <i className="recent-dot" />
                Recent XP
              </span>
              <span>
                <Target />
                Linked to focus goal
              </span>
            </div>
          </div>
          {filtered.length > 40 && (
            <p className="gentle">
              <span>
                Tree view shows the first 40 matching branches for clarity. Use
                Compact view to browse all {filtered.length} skills in fast
                pages.
              </span>
            </p>
          )}
        </>
      )}
    </>
  );
}
function branchStyle(a: Skill, b: Skill) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    len = Math.sqrt(dx * dx + dy * dy),
    ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  return {
    left: a.x + "%",
    top: a.y + 4 + "%",
    width: len + "%",
    transform: `rotate(${ang}deg)`,
  };
}
function SkillDetail({ skill }: { skill: Skill }) {
  return (
    <>
      <div
        className="skill-hero"
        style={{ "--accent": skill.color } as React.CSSProperties}
      >
        <div className="skill-badge">{skill.icon}</div>
        <div>
          <p>{skill.category}</p>
          <h2>{skill.name}</h2>
          <span>Discovered 14 months ago · Active this week</span>
        </div>
        <div className="level-block">
          <small>CURRENT LEVEL</small>
          <b>{skill.level}</b>
        </div>
      </div>
      <div className="stats-row">
        <div>
          <b>{skill.xp.toLocaleString()}</b>
          <small>Lifetime XP</small>
        </div>
        <div>
          <b>+185</b>
          <small>Last 30 days</small>
        </div>
        <div>
          <b>74</b>
          <small>Activities</small>
        </div>
        <div>
          <b>High</b>
          <small>Evidence strength</small>
        </div>
      </div>
      <div className="detail-grid">
        <div>
          <div className="card chart-card">
            <SectionHead title="XP over time" action="Last 6 months" />
            <div className="area-chart">
              <svg viewBox="0 0 600 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                    <stop stopColor={skill.color} stopOpacity=".35" />
                    <stop offset="1" stopColor={skill.color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 165 C80 150 90 145 145 130 S220 116 265 120 S340 80 380 90 S455 45 500 65 S555 25 600 20 L600 180 L0 180Z"
                  fill="url(#fade)"
                />
                <path
                  d="M0 165 C80 150 90 145 145 130 S220 116 265 120 S340 80 380 90 S455 45 500 65 S555 25 600 20"
                  fill="none"
                  stroke={skill.color}
                  strokeWidth="4"
                />
              </svg>
            </div>
          </div>
          <SectionHead title="How you gained this XP" action="All time" />
          <div className="source-list">
            <div>
              <span>
                <Swords />
                Quests
              </span>
              <b>1,680 XP</b>
              <Progress value={52} color={skill.color} />
            </div>
            <div>
              <span>
                <Activity />
                Activities
              </span>
              <b>920 XP</b>
              <Progress value={29} color={skill.color} />
            </div>
            <div>
              <span>
                <Award />
                Achievements
              </span>
              <b>420 XP</b>
              <Progress value={13} color={skill.color} />
            </div>
          </div>
        </div>
        <div>
          <div className="card side-card">
            <h3>Level progress</h3>
            <div className="level-progress">
              <b>{skill.xp.toLocaleString()}</b>
              <span>/ {skill.next.toLocaleString()} XP</span>
            </div>
            <Progress
              value={(skill.xp / skill.next) * 100}
              color={skill.color}
            />
            <p>
              {(skill.next - skill.xp).toLocaleString()} XP until Level{" "}
              {skill.level + 1}
            </p>
          </div>
          <div className="card side-card">
            <h3>Related goals</h3>
            <div className="linked">
              <span>🚀</span>
              <div>
                <b>Build & launch SkillTree</b>
                <small>Focus · 68%</small>
              </div>
            </div>
          </div>
          <div className="card side-card">
            <h3>Achievements</h3>
            <div className="badges">
              <span>⚡</span>
              <span>◆</span>
              <span>🏆</span>
              <span className="locked">?</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Quests({
  quests,
  onQuest,
  onAdd,
  authenticated,
}: {
  quests: Quest[];
  onQuest: (id: string) => void;
  onAdd: () => void;
  authenticated: boolean;
}) {
  return (
    <>
      <div className="toolbar">
        <div className="tabs" aria-label="Quest summary">
          <span className="active">
            Ready <span>{quests.filter((q) => q.status === "ready" || q.status === "overdue").length}</span>
          </span>
          <span>In progress</span>
          <span>Planned</span>
          <span>Completed</span>
        </div>
        <button className="primary" onClick={onAdd}>
          <Plus /> New quest
        </button>
      </div>
      <div className="board">
        <div className="board-col">
          <h3>
            <i className="ready" />
            Ready <span>{quests.filter((q) => !q.done).length}</span>
          </h3>
          {quests
            .filter((q) => q.status === "ready" || q.status === "overdue")
            .map((q) => (
              <div className="quest-card" key={q.id}>
                <button
                  className="quest-check"
                  aria-label={`Complete ${q.title}`}
                  onClick={() => onQuest(q.id)}
                >
                  <Check />
                </button>
                <span className="pill">{q.goal}</span>
                <h3>{q.title}</h3>
                <p>
                  <CalendarDays /> {q.due}
                  <b>
                    <Zap /> {q.xp} XP
                  </b>
                </p>
                {authenticated && (
                  <Link className="outline" href={`/quests/${q.id}`}>
                    View details
                  </Link>
                )}
              </div>
            ))}
        </div>
        <div className="board-col">
          <h3>
            <i className="progressing" />
            In progress <span>{quests.filter((q) => q.status === "in_progress").length}</span>
          </h3>
          {quests.filter((q) => q.status === "in_progress").map((q) => (
            <div className="quest-card" key={q.id}>
              <span className="pill">{q.goal}</span><h3>{q.title}</h3>
              <p><CalendarDays /> {q.due}<b><Zap /> {q.xp} XP</b></p>
              {authenticated && <Link className="outline" href={`/quests/${q.id}`}>Continue</Link>}
            </div>
          ))}
        </div>
        <div className="board-col">
          <h3>
            <i className="done-dot" />
            Recently completed{" "}
            <span>{quests.filter((q) => q.status === "completed" || q.done).length}</span>
          </h3>
          {quests
            .filter((q) => q.status === "completed" || q.done)
            .map((q) => (
              <div className="quest-card completed" key={q.id}>
                <Check />
                <h3>{q.title}</h3>
                <p>
                  Completed today<b>+{q.xp} XP</b>
                </p>
                {authenticated && (
                  <Link className="outline" href={`/quests/${q.id}`}>
                    View details
                  </Link>
                )}
              </div>
            ))}
        </div>
        <div className="board-col">
          <h3><i />Planned <span>{quests.filter((q) => q.status === "planned").length}</span></h3>
          {quests.filter((q) => q.status === "planned").map((q) => (
            <div className="quest-card" key={q.id}>
              <span className="pill">{q.goal}</span><h3>{q.title}</h3>
              <p><CalendarDays /> {q.due}<b><Zap /> {q.xp} XP</b></p>
              {authenticated && <Link className="outline" href={`/quests/${q.id}`}>Plan quest</Link>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
function Habits({
  habits,
  onHabit,
  onAdd,
  authenticated,
}: {
  habits: Habit[];
  onHabit: (id: string) => void;
  onAdd: () => void;
  authenticated: boolean;
}) {
  const [view, setView] = useState<"today" | "all">("today");
  const visibleHabits = view === "today" ? habits.filter((habit) => habit.due) : habits;
  return (
    <>
      <div className="toolbar">
        <div className="tabs">
          <button className={view === "today" ? "active" : ""} onClick={() => setView("today")}>Today</button>
          <button className={view === "all" ? "active" : ""} onClick={() => setView("all")}>All habits</button>
        </div>
        <button className="primary" onClick={onAdd}>
          <Plus /> New habit
        </button>
      </div>
      <div className="habit-summary">
        <div>
          <Flame />
          <span>
            <b>Today&apos;s rhythm</b>
            <small>
              {habits.filter((h) => h.due && h.done).length} of {habits.filter((h) => h.due).length} due habits
              completed
            </small>
          </span>
        </div>
      </div>
      <div className="habit-list">
        {visibleHabits.map((h) => (
          <div
            className={h.done ? "habit-wide done" : "habit-wide"}
            key={h.id}
          >
            <span className="habit-icon">{h.icon}</span>
            <div>
              <h3>{h.title}</h3>
              <p>
                {h.detail} · +{h.xp} XP
              </p>
            </div>
            {authenticated && (
              <Link className="outline" href={`/habits/${h.id}`}>
                Details
              </Link>
            )}
            <button
              className="check"
              aria-label={h.done ? `${h.title} completed` : `Complete ${h.title}`}
              disabled={h.done}
              onClick={() => onHabit(h.id)}
            >
              {h.done && <Check />}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
function Achievements() {
  const a = [
    ["First Steps", "Log your first activity", "⚡", "Common"],
    ["Deep Work", "Complete 10 focus sessions", "◆", "Uncommon"],
    ["Momentum Builder", "Stay active for 30 days", "🔥", "Rare"],
    ["Level 10", "Reach character level 10", "✦", "Uncommon"],
    ["Goal Getter", "Complete your first goal", "🏆", "Rare"],
    ["Century", "Log 100 activities", "100", "Locked"],
  ];
  return (
    <>
      <div className="achievement-hero">
        <div>
          <span className="eyebrow">ACHIEVEMENT SHOWCASE</span>
          <h2>Momentum Builder</h2>
          <p>You made meaningful progress on 30 different days.</p>
          <span className="rarity">Unlocked by 8.2% of eligible users</span>
        </div>
        <div className="medal">🔥</div>
      </div>
      <SectionHead title="Your achievements" action="12 unlocked" />
      <div className="achievement-grid">
        {a.map((x, i) => (
          <div
            className={
              i === 5 ? "achievement locked-achievement" : "achievement"
            }
            key={x[0]}
          >
            <span>{x[2]}</span>
            <div>
              <h3>{x[0]}</h3>
              <p>{x[1]}</p>
              <small>{x[3]}</small>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
function HistoryPage() {
  const rows = [
    [
      "Today",
      "Quest completed",
      "Polish the onboarding flow",
      "+50 XP",
      "#7c6cf2",
    ],
    ["Today", "Habit completed", "Move for 30 minutes", "+15 XP", "#e48253"],
    [
      "Yesterday",
      "Activity logged",
      "Easy 5 km recovery run",
      "+35 XP",
      "#e48253",
    ],
    [
      "6 Aug",
      "Goal progress",
      "Emergency fund increased by £250",
      "+25 XP",
      "#44a77a",
    ],
    ["4 Aug", "Achievement unlocked", "Momentum Builder", "+150 XP", "#ca9d42"],
    [
      "2 Aug",
      "Skill level up",
      "Product Design reached Level 12",
      "",
      "#7c6cf2",
    ],
  ];
  return (
    <>
      <div className="filterbar">
        <div className="search">
          <Search />
          <input placeholder="Search your history" />
        </div>
        <button>All activity</button>
        <button>All time</button>
      </div>
      <div className="history-list">
        {rows.map((r, i) => (
          <div className="history-row" key={i}>
            <span className="history-date">{r[0]}</span>
            <i style={{ background: r[4] }} />
            <div>
              <small>{r[1]}</small>
              <h3>{r[2]}</h3>
            </div>
            <b>{r[3]}</b>
            <button>
              <MoreHorizontal />
            </button>
          </div>
        ))}
      </div>
      <button className="load">Load older activity</button>
    </>
  );
}
function Insights() {
  return (
    <>
      <div className="insight-top">
        <div className="card score">
          <span className="eyebrow">LAST 30 DAYS</span>
          <b>1,245</b>
          <small>XP earned</small>
          <em>↑ 18% vs previous period</em>
        </div>
        <div className="card score">
          <span className="eyebrow">ACTIVE DAYS</span>
          <b>21</b>
          <small>of 30 days</small>
          <em>Strong consistency</em>
        </div>
        <div className="card score">
          <span className="eyebrow">GOALS MOVED</span>
          <b>4</b>
          <small>across 3 domains</small>
          <em>Healthy balance</em>
        </div>
      </div>
      <div className="detail-grid">
        <div className="card chart-card">
          <SectionHead title="Your growth" action="Last 30 days" />
          <div className="area-chart tall">
            <svg viewBox="0 0 600 220" preserveAspectRatio="none">
              <path
                d="M0 195 C60 180 90 190 130 155 S210 165 250 125 S315 130 350 100 S410 85 450 92 S515 45 600 30 L600 220 L0 220Z"
                fill="rgba(124,108,242,.13)"
              />
              <path
                d="M0 195 C60 180 90 190 130 155 S210 165 250 125 S315 130 350 100 S410 85 450 92 S515 45 600 30"
                fill="none"
                stroke="#7c6cf2"
                strokeWidth="4"
              />
            </svg>
          </div>
        </div>
        <div>
          <div className="card side-card">
            <h3>Strongest skills</h3>
            {skills.slice(3, 7).map((s, i) => (
              <div className="rank" key={s.id}>
                <b>{i + 1}</b>
                <span style={{ color: s.color }}>{s.icon}</span>
                <div>
                  <strong>{s.name}</strong>
                  <small>+{[380, 290, 225, 160][i]} XP</small>
                </div>
              </div>
            ))}
          </div>
          <div className="card insight-note">
            <Sparkles />
            <div>
              <b>A pattern worth noticing</b>
              <p>
                Your best progress days start with one focus quest before
                midday.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
function Profile() {
  return (
    <>
      <div className="profile-hero">
        <div className="profile-avatar">
          KB<span>18</span>
        </div>
        <div>
          <p>CHARACTER PROFILE</p>
          <h2>Koby’s SkillTree</h2>
          <span>Building products, health, and a life with momentum.</span>
        </div>
        <button className="outline">Edit profile</button>
      </div>
      <div className="profile-stats">
        <div>
          <b>18</b>
          <span>Character level</span>
        </div>
        <div>
          <b>12,480</b>
          <span>Lifetime XP</span>
        </div>
        <div>
          <b>16</b>
          <span>Discovered skills</span>
        </div>
        <div>
          <b>12</b>
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
            <button className="primary">Explore SkillTree</button>
          </div>
        </div>
        <div className="card side-card">
          <h3>Featured achievements</h3>
          <div className="badges large">
            <span>🔥</span>
            <span>◆</span>
            <span>🏆</span>
          </div>
          <h3>Top skills</h3>
          {skills.slice(3, 6).map((s) => (
            <div className="linked" key={s.id}>
              <span style={{ color: s.color }}>{s.icon}</span>
              <div>
                <b>{s.name}</b>
                <small>Level {s.level}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
function Generic({ page, onExplore }: { page: Page; onExplore: () => void }) {
  return (
    <div className="empty">
      <div>
        <Settings />
      </div>
      <h2>
        {page === "settings" ? "Make SkillTree yours" : "Season 3 · Momentum"}
      </h2>
      <p>
        {page === "settings"
          ? "Theme, reminders, privacy, accessibility, timezone, exports, and gamification preferences live here."
          : "A fresh chapter for your progress. Seasonal XP never replaces your lifetime growth."}
      </p>
      <button className="primary" onClick={onExplore}>
        Create your SkillTree
      </button>
    </div>
  );
}
function DemoConversion({ close }: { close: () => void }) {
  return (
    <div
      className="modal-wrap"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div
        className="quick-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Create your SkillTree"
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">READ-ONLY DEMO</span>
            <h2>Make this progress yours</h2>
          </div>
          <button
            className="icon-btn"
            onClick={close}
            aria-label="Close quick add"
          >
            <X />
          </button>
        </div>
        <p>
          This tour uses synthetic data and never saves changes. Create a
          private account to complete quests, log habits and grow your own
          permanent SkillTree.
        </p>
        <div className="quick-grid">
          <a className="featured" href="/start-free">
            <span>
              <Sparkles />
            </span>
            <div>
              <b>Create your SkillTree</b>
              <small>Start free with your first real goal</small>
            </div>
            <ChevronRight />
          </a>
          <a href="/features">
            <span>
              <BookOpen />
            </span>
            <div>
              <b>See how it works</b>
              <small>Explore the complete daily growth loop</small>
            </div>
            <ChevronRight />
          </a>
        </div>
        <p className="modal-tip">
          <ShieldCheck /> Your SkillTree is private by default
        </p>
      </div>
    </div>
  );
}
