import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, ShieldCheck } from "lucide-react";
import { MarketingShell } from "@/components/marketing";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Start SkillTree IRL free. Upgrade for deeper analysis, integrations or a separate team workspace—never for XP or progress.",
  alternates: { canonical: "/pricing" },
};

const plans = [
  {
    name: "Free",
    eyebrow: "BUILD THE DAILY HABIT",
    price: "£0",
    cadence: "forever",
    body: "Everything needed to choose a goal, act on it and keep a permanent record.",
    best: "Best for trying SkillTree or managing a focused set of personal goals.",
    items: ["10 active goals", "Unlimited quests, habits and activities", "Permanent SkillTree and history", "Daily and weekly insights", "25 MB private evidence"],
    cta: "Start free",
    href: "/sign-in?mode=signup",
  },
  {
    name: "Pro",
    eyebrow: "UNDERSTAND THE LONG VIEW",
    price: "£7.99",
    cadence: "per month",
    body: "For people using SkillTree as a long-term system across work, health, learning and life.",
    best: "Upgrade when deeper patterns, unlimited planning or automation save you time.",
    items: ["Unlimited active goals", "30-day patterns and completion forecasts", "Year reviews and deeper history", "Imports, integrations and developer tools", "Templates and 250 MB private evidence"],
    cta: "Start 14-day Pro trial",
    href: "/sign-in?mode=signup",
    featured: true,
  },
  {
    name: "Company",
    eyebrow: "ALIGN A TEAM, NOT THEIR PRIVATE LIVES",
    price: "£6",
    cadence: "per person / month",
    body: "A separate workspace for shared outcomes and check-ins. Three-seat minimum.",
    best: "For teams that need clarity and progress without employee surveillance.",
    items: ["Private personal trees stay separate", "Shared objectives and assignments", "Owner, admin, manager and member roles", "Visibility-controlled check-ins", "Billing, seats and cancellation controls"],
    cta: "Create a company workspace",
    href: "/workspace/new",
  },
];

const questions = [
  ["Is Free a limited demo?", "No. Free includes the complete daily loop and permanent history. Limits apply to active goals, advanced analysis, integrations and evidence storage—not to basic progress."],
  ["Can I lose XP if I cancel Pro?", "No. Your earned progression and history remain. Pro-only tools stop, and new usage returns to Free limits."],
  ["Can a company see my personal SkillTree?", "No. Company objectives, assignments and check-ins live in a separate workspace. Personal goals, journal, evidence, XP and history are not copied to an employer."],
  ["How do upgrades, downgrades and cancellation work?", "Checkout and account management use Stripe. Cancellation is scheduled for the end of the paid period, and the app treats Stripe webhooks—not a browser redirect—as the source of truth."],
];

export default function Page() {
  return (
    <MarketingShell>
      <section className="marketing-page-hero marketing-page-hero-v2 pricing-hero-v2">
        <span>FAIR PRICING · NO PAY-TO-WIN</span>
        <h1>Use it free. Upgrade when it earns its place.</h1>
        <p>Pay for depth, automation or team coordination. Never for XP, levels, essential privacy or access to the work you already recorded.</p>
        <small><Check /> No card for Free <Check /> 14-day paid-plan trials <Check /> Cancel in Stripe</small>
      </section>
      <section className="pricing-grid pricing-grid-v2">
        {plans.map(plan => (
          <article key={plan.name} className={plan.featured ? "featured" : ""}>
            {plan.featured && <span className="pricing-badge">MOST POPULAR</span>}
            <small>{plan.eyebrow}</small>
            <h2>{plan.name}</h2>
            <div className="pricing-price"><strong>{plan.price}</strong><span>{plan.cadence}</span></div>
            <p>{plan.body}</p>
            <em>{plan.best}</em>
            <ul>{plan.items.map(item => <li key={item}><Check />{item}</li>)}</ul>
            <Link className="marketing-button" href={plan.href}>{plan.cta}<ArrowRight /></Link>
          </article>
        ))}
      </section>
      <section className="pricing-principle">
        <ShieldCheck />
        <div><span>THE LINE WE WILL NOT CROSS</span><h2>Your motivation is not for sale.</h2></div>
        <p>Money cannot buy progression, repair a missed streak, move someone above another person, or unlock basic privacy and account security.</p>
      </section>
      <section className="pricing-faq">
        <header><span>PLAIN ANSWERS</span><h2>Before you choose.</h2></header>
        <div>{questions.map(([question,answer],index)=><details key={question} open={index===0}><summary><b>{question}</b><ChevronDown /></summary><p>{answer}</p></details>)}</div>
      </section>
    </MarketingShell>
  );
}
