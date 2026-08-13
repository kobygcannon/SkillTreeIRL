"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Habit = { id:string; name:string; frequency:{days?:number[]}; timezone:string; xp_reward:number; minimum_target:number|null; minimum_unit:string|null; goal_id:string|null; start_date:string; end_date:string|null };
type Choice = { id:string; title?:string; name?:string };
const weekdayNames = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export default function HabitManager({ habit, goals, skills, linkedSkillIds, reminderNextRun }:{ habit:Habit; goals:Choice[]; skills:Choice[]; linkedSkillIds:string[]; reminderNextRun:string|null }) {
  const router=useRouter();
  const [form,setForm]=useState({name:habit.name,days:habit.frequency.days||[1,2,3,4,5,6,7],xpReward:String(habit.xp_reward),minimumTarget:habit.minimum_target?String(habit.minimum_target):"",minimumUnit:habit.minimum_unit||"",goalId:habit.goal_id||"",skillIds:linkedSkillIds,startDate:habit.start_date,endDate:habit.end_date||"",reminderNextRun:reminderNextRun?new Date(reminderNextRun).toISOString().slice(0,16):""});
  const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
  const save=async()=>{setBusy(true);setMessage("");const response=await fetch(`/api/v1/habits/${habit.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({name:form.name,frequency:{days:form.days},timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,goalId:form.goalId||null,skillIds:form.skillIds,xpReward:Number(form.xpReward),minimumTarget:form.minimumTarget?Number(form.minimumTarget):null,minimumUnit:form.minimumUnit||null,startDate:form.startDate,endDate:form.endDate||null,reminderNextRun:form.reminderNextRun?new Date(form.reminderNextRun).toISOString():null})});const body=await response.json().catch(()=>({}));setBusy(false);if(!response.ok){setMessage(body.error?.message||"The habit could not be saved.");return}setMessage("Habit schedule saved.");router.refresh()};
  const toggleDay=(day:number)=>setForm({...form,days:form.days.includes(day)?form.days.filter(value=>value!==day):[...form.days,day].sort()});
  const toggleSkill=(id:string)=>setForm({...form,skillIds:form.skillIds.includes(id)?form.skillIds.filter(value=>value!==id):[...form.skillIds,id]});
  return <div className="card side-card"><h2>Habit setup</h2><div className="real-form">
    <label>Name<input value={form.name} maxLength={180} onChange={e=>setForm({...form,name:e.target.value})}/></label>
    <fieldset><legend>Preferred days</legend><div className="form-actions">{weekdayNames.map((name,index)=><label key={name}><input type="checkbox" checked={form.days.includes(index+1)} onChange={()=>toggleDay(index+1)}/>{name}</label>)}</div></fieldset>
    <div className="form-row"><label>Minimum target<input type="number" min="0.01" step="any" value={form.minimumTarget} onChange={e=>setForm({...form,minimumTarget:e.target.value})}/></label><label>Unit<input maxLength={40} placeholder="minutes, pages, sessions…" value={form.minimumUnit} onChange={e=>setForm({...form,minimumUnit:e.target.value})}/></label></div>
    <div className="form-row"><label>XP reward<input type="number" min="0" max="500" value={form.xpReward} onChange={e=>setForm({...form,xpReward:e.target.value})}/></label><label>Linked goal<select value={form.goalId} onChange={e=>setForm({...form,goalId:e.target.value})}><option value="">No goal</option>{goals.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label></div>
    <fieldset><legend>Linked skills</legend>{skills.map(item=><label key={item.id}><input type="checkbox" checked={form.skillIds.includes(item.id)} onChange={()=>toggleSkill(item.id)}/>{item.name}</label>)}</fieldset>
    <div className="form-row"><label>Start date<input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></label><label>Optional end date<input type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></label></div>
    <label>Optional reminder<input type="datetime-local" value={form.reminderNextRun} onChange={e=>setForm({...form,reminderNextRun:e.target.value})}/></label><small>Leave blank to disable this habit reminder. Quiet hours and notification preferences still apply.</small>
    <button className="primary" disabled={busy||!form.days.length} onClick={save}>Save habit</button>
  </div>{message&&<p role="status">{message}</p>}</div>;
}
