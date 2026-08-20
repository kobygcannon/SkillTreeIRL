import type { Metadata } from "next";
import { MarketingPage } from "@/components/marketing";

export const metadata: Metadata = {
  title: "Your personal SkillTree",
  description: "Build a permanent personal skill tree from meaningful real-world action—not purchased points.",
  alternates: { canonical: "/skilltree" },
};

export default function Page() {
  return <MarketingPage
    eyebrow="PERMANENT CHARACTER GROWTH"
    title="Your projects end. What you learned should remain."
    intro="SkillTree turns completed work into a durable map of your capabilities. It is private by default, grounded in real activity and designed to stay useful for years."
    sections={[
      {title:"Skills emerge from the work",body:"Create a skill directly or attach one to a quest, habit, focus session or activity. A single action can contribute to several skills with an explicit allocation.",points:["Custom names and parent branches","Multiple skills per action","Source-linked progression"]},
      {title:"Every point has a reason",body:"XP summarises recorded action; it is not a currency. Ledger entries retain their source, corrections are reversals, and deleting or changing a goal cannot silently manufacture progression.",points:["Server-authoritative XP ledger","Idempotent completion","No XP purchases or paid multipliers"]},
      {title:"Organise without losing history",body:"Rename a skill, move it into another branch, archive one you no longer practise or merge duplicates. Existing activity and XP remain attributable.",points:["Branch and sub-skill structure","Safe duplicate merging","Archived skills remain in history"]},
      {title:"Use the tree at ten skills or hundreds",body:"The visual tree makes focused branches satisfying to explore. Search, filters and a compact view keep a long-lived account usable as the character becomes complex.",points:["Responsive visual layout","Searchable compact browser","Focused branch detail"]},
      {title:"Share only the version you choose",body:"Profiles begin private. An intentional public or unlisted snapshot excludes private notes, evidence, financial values and location.",points:["Private by default","Short-lived evidence access","Separate personal and company data"]},
    ]}
  />;
}
