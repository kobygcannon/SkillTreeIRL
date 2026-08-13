import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ObjectPage from "@/components/object-page";
import QuestManager from "@/components/quest-manager";
export default async function QuestDeepLink({
  params,
}: PageProps<"/quests/[id]">) {
  const { id } = await params,
    supabase = await createClient();
  if (!supabase) redirect("/sign-in");
  const [questResult, candidatesResult, skillsResult] = await Promise.all([supabase
    .from("quests")
    .select(
      "id,title,description,goal_id,status,xp_reward,due_at,priority,estimated_minutes,recurrence,evidence_required,pinned_at,goals(id,title),quest_skill_rewards(skill_id),quest_completions(completed_at,undone_at,activity_id),quest_subtasks(id,title,completed_at,sort_order),quest_dependencies(depends_on_quest_id,quests!quest_dependencies_depends_on_quest_id_fkey(title))",
    )
    .eq("id", id)
    .maybeSingle(), supabase.from("quests").select("id,title").neq("id", id).neq("status", "completed").order("title").limit(250),supabase.from("skills").select("id,name").is("archived_at",null).order("name").limit(250)]);
  if(questResult.error||candidatesResult.error||skillsResult.error)throw new Error("Quest could not be loaded",{cause:questResult.error||candidatesResult.error||skillsResult.error});
  const data=questResult.data,candidates=candidatesResult.data,skills=skillsResult.data;
  if (!data) notFound();
  const completion = (data.quest_completions || []).find(
    (item) => !item.undone_at,
  );
  return (
    <ObjectPage
      eyebrow={`QUEST · ${data.status.replaceAll("_", " ")}`}
      title={data.title}
      subtitle={data.description}
    >
      <div className="card side-card">
        <p>
          {data.xp_reward} planned XP
          {data.due_at
            ? ` · due ${new Date(data.due_at).toLocaleString()}`
            : " · no deadline"}
        </p>
        <p>
          {data.evidence_required ? "Evidence required" : "Evidence optional"}
        </p>
        {data.goals && (
          <Link href={`/goals/${(data.goals as unknown as { id: string }).id}`}>
            Goal: {(data.goals as unknown as { title: string }).title}
          </Link>
        )}
        {completion && (
          <p>
            <Link href={`/activities/${completion.activity_id}`}>
              View completion activity
            </Link>
          </p>
        )}
      </div>
      {data.status !== "completed" && (
        <QuestManager
          quest={data}
          subtasks={data.quest_subtasks || []}
          dependencies={(data.quest_dependencies || []) as never[]}
          candidates={candidates || []}
          skills={skills || []}
          linkedSkillIds={(data.quest_skill_rewards || []).map(item=>item.skill_id)}
        />
      )}
    </ObjectPage>
  );
}
