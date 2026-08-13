import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ObjectPage from "@/components/object-page";
import HabitOccurrenceManager from "@/components/habit-occurrence-manager";
import HabitManager from "@/components/habit-manager";
export default async function HabitDeepLink({
  params,
}: PageProps<"/habits/[id]">) {
  const { id } = await params,
    supabase = await createClient();
  if (!supabase) redirect("/sign-in");
  const [habitResult, goalsResult, skillsResult, remindersResult] = await Promise.all([
    supabase.from("habits").select("id,name,frequency,timezone,xp_reward,minimum_target,minimum_unit,goal_id,start_date,end_date,archived_at,goals(id,title),habit_occurrences(local_date,status,detail),habit_skill_links(skill_id)").eq("id", id).maybeSingle(),
    supabase.from("goals").select("id,title").in("status", ["active","focus","later","paused"]).order("title").limit(250),
    supabase.from("skills").select("id,name").is("archived_at", null).order("name").limit(250),
    supabase.from("reminders").select("next_run_at").eq("reminder_type", "habit").eq("entity_id", id).maybeSingle(),
  ]);
  if(habitResult.error||goalsResult.error||skillsResult.error||remindersResult.error)throw new Error("Habit could not be loaded",{cause:habitResult.error||goalsResult.error||skillsResult.error||remindersResult.error});
  const data=habitResult.data,goals=goalsResult.data,skills=skillsResult.data,reminders=remindersResult.data;
  if (!data) notFound();
  return (
    <ObjectPage
      eyebrow={`HABIT · ${data.archived_at ? "archived" : "active"}`}
      title={data.name}
      subtitle={`${data.xp_reward} XP per completion · ${data.timezone}`}
    >
      <div className="card side-card">
        <p>Schedule: {JSON.stringify(data.frequency)}</p>
        <p>
          {data.start_date}
          {data.end_date ? ` – ${data.end_date}` : " onward"}
        </p>
        {data.goals && (
          <Link href={`/goals/${(data.goals as unknown as { id: string }).id}`}>
            Goal: {(data.goals as unknown as { title: string }).title}
          </Link>
        )}
      </div>
      {!data.archived_at && <HabitOccurrenceManager habitId={id} timezone={data.timezone} />}
      {!data.archived_at && (
        <HabitManager
          habit={data as never}
          goals={goals || []}
          skills={skills || []}
          linkedSkillIds={(data.habit_skill_links || []).map(item => item.skill_id)}
          reminderNextRun={reminders?.next_run_at || null}
        />
      )}
      <div className="card side-card">
        <h2>Recent occurrences</h2>
        {(data.habit_occurrences || [])
          .sort((a, b) => b.local_date.localeCompare(a.local_date))
          .slice(0, 30)
          .map((item) => (
            <p key={item.local_date}>
              <b>{item.local_date}</b> · {item.status}
              {item.detail ? ` · ${item.detail}` : ""}
            </p>
          ))}
      </div>
    </ObjectPage>
  );
}
