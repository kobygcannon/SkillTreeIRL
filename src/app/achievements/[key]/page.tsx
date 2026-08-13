import {notFound,redirect} from "next/navigation";
import ObjectPage from "@/components/object-page";
import {createClient} from "@/lib/supabase/server";

export default async function AchievementDeepLink({params}:PageProps<"/achievements/[key]">){
  const {key}=await params,supabase=await createClient();
  if(!supabase)redirect("/sign-in");
  const [{data:definition},{data:unlock}]=await Promise.all([
    supabase.from("achievement_definitions").select("key,title,description,category,rarity_eligible,xp_reward,criteria").eq("key",key).maybeSingle(),
    supabase.from("achievement_unlocks").select("xp_awarded,unlocked_at,metadata").eq("achievement_key",key).maybeSingle()
  ]);
  if(!definition)notFound();
  return <ObjectPage eyebrow={`${definition.category} · ${unlock?"unlocked":"locked"}`} title={definition.title} subtitle={definition.description}>
    <div className="card side-card"><h2>{unlock?"Part of your story":"Still to discover"}</h2>{unlock?<><p>Unlocked {new Intl.DateTimeFormat("en-GB",{dateStyle:"long"}).format(new Date(unlock.unlocked_at))}</p><p>+{unlock.xp_awarded} XP awarded</p></>:<p>Keep making meaningful progress. Unlocks are awarded from verified events and never disappear when a goal changes.</p>}</div>
  </ObjectPage>;
}
