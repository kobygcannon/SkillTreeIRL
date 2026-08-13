import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ObjectPage from "@/components/object-page";
import ActivityEvidenceManager from "@/components/activity-evidence-manager";
export default async function ActivityDeepLink({
  params,
}: PageProps<"/activities/[id]">) {
  const { id } = await params,
    supabase = await createClient();
  if (!supabase) redirect("/sign-in");
  const { data } = await supabase
    .from("activities")
    .select(
      "description,duration_minutes,quantity,unit,effort,confidence,private_note,occurred_at,reversed_at,activity_goal_links(goals(id,title)),activity_skill_links(xp_awarded,skills(id,name))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  return (
    <ObjectPage
      eyebrow={`ACTIVITY · ${data.confidence.replaceAll("_", " ")}`}
      title={data.description}
      subtitle={
        data.reversed_at
          ? "This activity was reversed. Its correction remains in history."
          : null
      }
    >
      <div className="card side-card">
        <p>
          {new Date(data.occurred_at).toLocaleString()}
          {data.duration_minutes ? ` · ${data.duration_minutes} minutes` : ""}
          {data.quantity ? ` · ${data.quantity} ${data.unit || ""}` : ""}
        </p>
        {data.private_note && (
          <p>
            <b>Private note:</b> {data.private_note}
          </p>
        )}
      </div>
      <div className="detail-grid">
        <div className="card side-card">
          <h2>Linked progress</h2>
          {(data.activity_goal_links || []).map((link) => (
            <p key={(link.goals as unknown as { id: string }).id}>
              <Link
                href={`/goals/${(link.goals as unknown as { id: string }).id}`}
              >
                {(link.goals as unknown as { title: string }).title}
              </Link>
            </p>
          ))}
          {(data.activity_skill_links || []).map((link) => (
            <p key={(link.skills as unknown as { id: string }).id}>
              <Link
                href={`/skills/${(link.skills as unknown as { id: string }).id}`}
              >
                {(link.skills as unknown as { name: string }).name}
              </Link>{" "}
              · +{link.xp_awarded} XP
            </p>
          ))}
        </div>
        <ActivityEvidenceManager activityId={id} />
      </div>
    </ObjectPage>
  );
}
