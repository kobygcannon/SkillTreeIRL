"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Subtask = { id: string; title: string; completed_at: string | null };
type Dependency = { depends_on_quest_id: string; quests: { title: string } | null };
type Candidate = { id: string; title: string };
type SkillChoice = { id:string; name:string };
type Quest = { id: string; title: string; description: string | null; status: string; xp_reward: number; due_at: string | null; priority: string; estimated_minutes: number | null; recurrence:{kind?:string;intervalDays?:number}|null; evidence_required: boolean; goal_id: string | null; pinned_at:string|null };

export default function QuestManager({ quest, subtasks, dependencies, candidates, skills, linkedSkillIds }: { quest: Quest; subtasks: Subtask[]; dependencies: Dependency[]; candidates: Candidate[]; skills:SkillChoice[]; linkedSkillIds:string[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ title: quest.title, description: quest.description || "", status: quest.status, xpReward: String(quest.xp_reward), dueAt: quest.due_at ? quest.due_at.slice(0, 16) : "", priority: quest.priority, estimatedMinutes: quest.estimated_minutes ? String(quest.estimated_minutes) : "", recurrence:quest.recurrence?.kind==="recurring"?"recurring":"none",intervalDays:String(quest.recurrence?.intervalDays||7),skillIds:linkedSkillIds,evidenceRequired: quest.evidence_required });
  const [subtask, setSubtask] = useState("");
  const [dependency, setDependency] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const call = async (method: string, body?: unknown, query = "") => {
    setBusy(true); setMessage("");
    const response = await fetch(`/api/v1/quests/${quest.id}${query}`, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) { setMessage(result.error?.message || "The quest could not be updated."); return false; }
    router.refresh(); return true;
  };
  const save = async () => { if (await call("PATCH", { ...form, xpReward: Number(form.xpReward), estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : null, dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null, recurrence:form.recurrence==="recurring"?{kind:"recurring",intervalDays:Number(form.intervalDays)}:null, goalId: quest.goal_id })) setMessage("Quest plan saved."); };
  return <div className="detail-grid">
    <section className="card side-card"><h2>Plan this quest</h2><div className="real-form">
      <label>Title<input value={form.title} maxLength={180} onChange={e=>setForm({...form,title:e.target.value})}/></label>
      <label>Description<textarea value={form.description} maxLength={2000} onChange={e=>setForm({...form,description:e.target.value})}/></label>
      <label>State<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="planned">Planned</option><option value="ready">Ready</option><option value="in_progress">In progress</option><option value="skipped">Skipped</option><option value="cancelled">Cancelled</option><option value="overdue">Overdue</option></select></label>
      <label>Priority<select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></label>
      <label>Estimated minutes<input type="number" min="1" max="100000" value={form.estimatedMinutes} onChange={e=>setForm({...form,estimatedMinutes:e.target.value})}/></label>
      <label>XP reward<input type="number" min="0" max="5000" value={form.xpReward} onChange={e=>setForm({...form,xpReward:e.target.value})}/></label>
      <label>Due date<input type="datetime-local" value={form.dueAt} onChange={e=>setForm({...form,dueAt:e.target.value})}/></label>
      <label>Recurrence<select value={form.recurrence} onChange={e=>setForm({...form,recurrence:e.target.value})}><option value="none">Does not repeat</option><option value="recurring">Repeat after completion</option></select></label>
      {form.recurrence==="recurring"&&<label>Repeat every (days)<input type="number" min="1" max="3650" value={form.intervalDays} onChange={e=>setForm({...form,intervalDays:e.target.value})}/></label>}
      <fieldset><legend>Linked skills</legend>{skills.map(skill=><label key={skill.id}><input type="checkbox" checked={form.skillIds.includes(skill.id)} onChange={()=>setForm({...form,skillIds:form.skillIds.includes(skill.id)?form.skillIds.filter(id=>id!==skill.id):[...form.skillIds,skill.id]})}/>{skill.name}</label>)}</fieldset>
      <label><input type="checkbox" checked={form.evidenceRequired} onChange={e=>setForm({...form,evidenceRequired:e.target.checked})}/> Require evidence to complete</label>
      <div className="form-actions"><button className="primary" disabled={busy} onClick={save}>Save quest</button><button className="outline" disabled={busy} onClick={async()=>{if(await call("POST",{action:quest.pinned_at?"unpin":"pin"}))setMessage(quest.pinned_at?"Quest unpinned.":"Pinned as your next best action.")}}>{quest.pinned_at?"Unpin":"Pin as next action"}</button></div>
    </div>{message&&<p role="status">{message}</p>}</section>
    <aside>
      <div className="card side-card"><h2>Subtasks</h2>{subtasks.map(item=><div className="linked" key={item.id}><input aria-label={`Complete ${item.title}`} type="checkbox" checked={Boolean(item.completed_at)} onChange={()=>call("PATCH",{action:"toggleSubtask",subtaskId:item.id,completed:!item.completed_at})}/><span>{item.title}</span><button className="outline" onClick={()=>call("DELETE",undefined,`?kind=subtask&targetId=${item.id}`)}>Remove</button></div>)}<div className="real-form"><label>New subtask<input value={subtask} maxLength={180} onChange={e=>setSubtask(e.target.value)}/></label><button className="outline" disabled={busy||!subtask.trim()} onClick={async()=>{if(await call("POST",{action:"addSubtask",title:subtask}))setSubtask("")}}>Add subtask</button></div></div>
      <div className="card side-card"><h2>Dependencies</h2><p>Dependencies guide planning; they do not block manual progress.</p>{dependencies.map(item=><div className="linked" key={item.depends_on_quest_id}><span>{item.quests?.title || "Quest"}</span><button className="outline" onClick={()=>call("DELETE",undefined,`?kind=dependency&targetId=${item.depends_on_quest_id}`)}>Remove</button></div>)}<div className="real-form"><label>Depends on<select value={dependency} onChange={e=>setDependency(e.target.value)}><option value="">Choose a quest</option>{candidates.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label><button className="outline" disabled={busy||!dependency} onClick={()=>call("POST",{action:"addDependency",dependsOnQuestId:dependency})}>Add dependency</button></div></div>
    </aside>
  </div>;
}
