import type { Metadata } from "next";
import { MarketingPage } from "@/components/marketing";

export const metadata: Metadata = {
  title: "Flexible life goals",
  description: "Track measurable, open-ended, recurring and composite life goals without destroying their history.",
  alternates: { canonical: "/goals" },
};

export default function Page() {
  return <MarketingPage
    eyebrow="GOALS THAT CAN EVOLVE"
    title="Make progress without pretending life follows a perfect plan."
    intro="Choose a measurement that fits the outcome. SkillTree helps you move today while preserving every revision, pause and change of direction."
    sections={[
      {title:"Pick the measurement that tells the truth",body:"A savings goal needs currency. A running goal may need distance or completed sessions. A creative practice may need no finish line at all. SkillTree supports eleven models so the tool adapts to the goal.",points:["Numeric, currency, percentage and duration","Frequency, recurring and milestone plans","Binary, composite, custom and open-ended"]},
      {title:"Break direction into doable work",body:"Turn a large outcome into milestones and quests. Dependencies keep later work out of the way, while a pinned action tells Today what matters most.",points:["Concrete next actions","Due dates and priorities when useful","Evidence requirements for important outcomes"]},
      {title:"Build practice without streak anxiety",body:"Habits record complete, partial, skipped and missed days in your timezone. A missed day is data—not a punishment, reset or reason to give up.",points:["Flexible recurrence and minimum targets","Quiet hours and reminder channels","No lost XP or broken-character penalty"]},
      {title:"Change the plan without erasing the past",body:"Revise targets, pause a goal, move it to later, complete it, abandon it or archive it. The timeline shows what changed and the work already done remains attached to your skills.",points:["Immutable progress events","Explicit revisions and reviews","Corrections through reversal events"]},
      {title:"Know whether the goal is helping",body:"Weekly signals show effort, movement and consistency. Pro uses your own history to offer a completion range and longer patterns—never a false guarantee.",points:["Current pace and recent movement","Time invested by goal and skill","Private evidence when proof matters"]},
    ]}
  />;
}
