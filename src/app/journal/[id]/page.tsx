import {notFound,redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import ObjectPage from "@/components/object-page";
import JournalBody,{JournalRelation} from "@/components/journal-body";

export default async function JournalDeepLink({params}:PageProps<"/journal/[id]">){
 const {id}=await params,supabase=await createClient();if(!supabase)redirect("/sign-in");
 const {data,error}=await supabase.from("journal_entries").select("title,body,mood,occurred_on,updated_at,goal_id,activity_id,skill_id,goal:goals(id,title),activity:activities(id,description),skill:skills(id,name)").eq("id",id).maybeSingle();
 if(error)throw new Error("Journal entry could not be loaded",{cause:error});if(!data)notFound();
 const goal=data.goal as unknown as {id:string;title:string}|null,activity=data.activity as unknown as {id:string;description:string}|null,skill=data.skill as unknown as {id:string;name:string}|null;
 return <ObjectPage eyebrow={`PRIVATE JOURNAL · ${data.occurred_on}`} title={data.title||"Reflection"} subtitle={data.mood?`Mood: ${data.mood}`:null}><article className="card side-card"><JournalBody body={data.body}/>{(goal||activity||skill)&&<p>{goal&&<JournalRelation type="goals" id={goal.id} label={goal.title}/>} {activity&&<JournalRelation type="activities" id={activity.id} label={activity.description}/>} {skill&&<JournalRelation type="skills" id={skill.id} label={skill.name}/>}</p>}<small>Updated {new Date(data.updated_at).toLocaleString()}</small></article></ObjectPage>;
}
