"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import GoalProgressDialog from "./goal-progress-dialog";
import type { GoalItem } from "@/app/page";

export default function GoalDeepLinkProgress({ goal }: { goal: GoalItem }) {
  const [current, setCurrent] = useState(goal.current);
  const [open, setOpen] = useState(false);
  const liveGoal = { ...goal, current };
  return <>
    <div className="card side-card deep-link-progress">
      <div>
        <span className="eyebrow">CURRENT PROGRESS</span>
        <h2>{current.toLocaleString()}{goal.target > 0 && <small> of {goal.target.toLocaleString()}</small>} <em>{goal.unit}</em></h2>
        <p>{goal.measurement?.replaceAll("_"," ")}{goal.deadline !== "No deadline" ? " · due " + goal.deadline : ""}</p>
      </div>
      <button className="primary" onClick={() => setOpen(true)}><Plus /> Add progress</button>
    </div>
    {open && <GoalProgressDialog goal={liveGoal} close={() => setOpen(false)} onSaved={setCurrent} />}
  </>;
}
