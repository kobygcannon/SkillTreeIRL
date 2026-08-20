import type { Metadata } from "next";
import { MarketingPage } from "@/components/marketing";

export const metadata: Metadata = {
  title: "Real SkillTree examples",
  description: "See concrete daily workflows for fitness, money, learning, creative work and long-term personal development.",
  alternates: { canonical: "/examples" },
};

export default function Page() {
  return <MarketingPage
    eyebrow="ONE ENGINE, MANY KINDS OF GROWTH"
    title="See exactly how people would use SkillTree."
    intro="The subject changes, but the useful loop stays the same: define what matters, choose one next action, record reality and learn from the history."
    sections={[
      {title:"Fitness — run a comfortable 10K",body:"Set a target of 30 training runs, schedule easy and long-run quests, track active time and distance, and grow Running, Endurance and Recovery. A missed week never erases previous work.",points:["Today: complete an easy 20-minute run","Weekly signal: sessions, distance and time","Evidence: optional route screenshot or race result"]},
      {title:"Money — build a £3,000 emergency fund",body:"Use a private currency target, add a recurring payday contribution habit and record meaningful reviews. Amounts and evidence remain private unless you explicitly share a safe summary.",points:["Today: review spending and transfer £50","Monthly signal: contribution pace","Skills: Budgeting, Planning and Consistency"]},
      {title:"Learning — become conversational in Spanish",body:"Combine lessons, listening, speaking and journal reflection under one frequency goal. Record partial practice honestly and see which kind of session actually happens consistently.",points:["Today: 15-minute listening exercise","Weekly signal: four varied practice sessions","Skills: Spanish, Listening and Conversation"]},
      {title:"Creative work — finish a first short story",body:"Use milestones for outline, draft and revision; focus sessions for actual writing; and optional evidence for draft versions. The Writing branch persists after this story is complete.",points:["Today: write the first 300 words","Signal: words and focused time","Skills: Writing, Editing and Story Structure"]},
      {title:"Team — launch a customer onboarding update",body:"A company workspace holds a shared objective, assignments and visibility-controlled check-ins. Each member's private personal SkillTree remains separate from the employer.",points:["Manager: define the outcome and assignees","Member: update only their own assignment","Company: see shared progress, never private journals or XP"]},
    ]}
  />;
}
