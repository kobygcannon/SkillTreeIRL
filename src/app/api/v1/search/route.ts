import {NextResponse} from "next/server";
import {authenticated,failure} from "@/domains/shared/http";

export async function GET(request:Request){
 const auth=await authenticated();if("error" in auth)return auth.error;
 const q=new URL(request.url).searchParams.get("q")?.trim();if(!q||q.length<2)return NextResponse.json({data:[]});
 const safe=q.replace(/[%_,()]/g," ").slice(0,80),pattern=`%${safe}%`;
 const [goals,skills,quests,activities,habits,journal,achievements]=await Promise.all([
  auth.supabase.from("goals").select("id,title,status,category").ilike("title",pattern).limit(8),
  auth.supabase.from("skills").select("id,name,category").ilike("name",pattern).is("archived_at",null).limit(8),
  auth.supabase.from("quests").select("id,title,status,due_at").ilike("title",pattern).limit(8),
  auth.supabase.from("activities").select("id,description,occurred_at").ilike("description",pattern).is("reversed_at",null).limit(8),
  auth.supabase.from("habits").select("id,name").ilike("name",pattern).is("archived_at",null).limit(8),
  auth.supabase.from("journal_entries").select("id,title,occurred_on").or(`title.ilike.${pattern},body.ilike.${pattern}`).limit(8),
  auth.supabase.from("achievement_definitions").select("key,title,category").or(`title.ilike.${pattern},description.ilike.${pattern}`).limit(8)
 ]);
 const error=goals.error||skills.error||quests.error||activities.error||habits.error||journal.error||achievements.error;if(error)return failure(error);
 return NextResponse.json({data:[
  ...(goals.data||[]).map(x=>({type:"goal",label:x.title,...x})),
  ...(skills.data||[]).map(x=>({type:"skill",label:x.name,...x})),
  ...(quests.data||[]).map(x=>({type:"quest",label:x.title,...x})),
  ...(habits.data||[]).map(x=>({type:"habit",label:x.name,...x})),
  ...(achievements.data||[]).map(x=>({id:x.key,type:"achievement",label:x.title,...x})),
  ...(activities.data||[]).map(x=>({type:"activity",label:x.description,...x})),
  ...(journal.data||[]).map(x=>({type:"journal",label:x.title||"Untitled journal entry",...x}))
 ]})
}
