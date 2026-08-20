import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ObjectPage from "@/components/object-page";
import LiveGoalContext from "@/components/live-goal-context";
import GoalDeepLinkProgress from "@/components/goal-deep-link-progress";

export default async function GoalDeepLink({ params }: PageProps<"/goals/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) redirect("/sign-in");
  const { data, error } = await supabase.from("goals")
    .select("title,description,category,status,measurement,current_value,target_value,unit,currency,deadline,priority")
    .eq("id",id).maybeSingle();
  if (error) throw new Error("Goal could not be loaded",{cause:error});
  if (!data) notFound();
  const deadline = data.deadline ? new Date(data.deadline).toLocaleDateString() : "No deadline";
  return <ObjectPage eyebrow={data.category + " · " + data.status} title={data.title} subtitle={data.description}>
    <GoalDeepLinkProgress goal={{
      id,
      title:data.title,
      category:data.category,
      icon:"◎",
      current:Number(data.current_value),
      target:Number(data.target_value || 0),
      unit:data.currency || data.unit || "",
      status:data.status,
      color:"#7465e8",
      deadline,
      momentum:"Building",
      measurement:data.measurement,
      priority:data.priority,
    }} />
    <LiveGoalContext goalId={id}/>
  </ObjectPage>;
}
