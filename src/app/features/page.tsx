import type { Metadata } from "next";
import { MarketingPage } from "@/components/marketing";

export const metadata: Metadata = {
  title: "How SkillTree works",
  description: "Turn goals into next actions, record real work, build permanent skills and understand your progress without streak punishment.",
  alternates: { canonical: "/features" },
};

export default function Page() {
  return <MarketingPage
    eyebrow="THE COMPLETE DAILY SYSTEM"
    title="From “I want to” to “look what I built.”"
    intro="SkillTree connects direction, action and reflection. Open it for a minute today, then use the history to make better decisions next week, next month and next year."
    sections={[
      {title:"Today answers one question: what should I do next?",body:"Your Today view prioritises pinned, due, in-progress and goal-linked work. You can complete a quest, practise a habit, start a focus session, update a measurable goal or record something already done.",points:["Understandable recommendations without AI","Fast completion and progress updates","Works across phone and desktop"]},
      {title:"Goals hold outcomes without forcing one shape",body:"Track a number, amount of money, percentage, frequency, duration, set of milestones, binary result, recurring outcome, composite plan or open-ended direction. Change the target through a revision instead of rewriting history.",points:["Pause, resume, complete, abandon or archive","Reviews explain why a plan changed","Progress corrections preserve an audit trail"]},
      {title:"Actions become a trustworthy record",body:"Activities are the canonical account of actual effort. Add duration, quantity, notes, skill allocation and optional evidence. Important writes are transactional and retry-safe, so a failed connection cannot quietly award progress twice.",points:["Private images, PDFs, text and secure links","Offline-safe activity and progress queue","Reversals correct mistakes without deletion"]},
      {title:"Skills survive individual projects",body:"Work can grow one or several skills. When a goal ends, the capability remains in your SkillTree with its source history. Merge duplicate skills or organise branches without losing earned progression.",points:["Every XP entry has a real source","No purchased XP or pay-to-win ranking","Visual tree plus scalable searchable view"]},
      {title:"Insights turn history into better choices",body:"Free shows daily and weekly signals. Pro adds longer-range patterns, forecast ranges and year reviews. The point is not to stare at charts—it is to notice what is working and decide what deserves attention next.",points:["Time and action patterns","Goal completion ranges, not fake certainty","Strongest-skill and seasonal trends"]},
    ]}
  />;
}
