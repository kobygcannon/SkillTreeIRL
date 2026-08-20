import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Dumbbell,
  GraduationCap,
  Leaf,
  Palette,
  PiggyBank,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Cta, MarketingShell } from "./marketing";
export default function MarketingHome() {
  return (
    <MarketingShell>
      <section className="marketing-hero">
        <div className="marketing-hero-copy">
          <span className="marketing-kicker">
            <Sparkles /> YOUR GOALS, TURNED INTO DAILY PROGRESS
          </span>
          <h1>
            Know what to do next.
            <br />
            <em>See how far you&apos;ve come.</em>
          </h1>
          <p>
            SkillTree turns the life you want into one clear next action—then
            keeps a permanent record of the goals, habits and skills you build.
          </p>
          <div>
            <Link className="marketing-button" href="/sign-in?mode=signup">
              Start with one goal <ArrowRight />
            </Link>
            <Link href="/demo">Try the interactive demo</Link>
          </div>
          <small>
            <Check /> Free daily planning <Check /> Private by default <Check />
            No streak guilt
          </small>
        </div>
        <div
          className="marketing-preview"
          aria-label="Example of the SkillTree daily experience"
        >
          <div className="preview-topbar">
            <div>
              <span className="preview-eyebrow">TODAY · TUESDAY 20 AUGUST</span>
              <h2>Good morning, Maya</h2>
              <p>One useful action is enough to move today forward.</p>
            </div>
            <span className="preview-momentum"><TrendingUp /> 4 active days this week</span>
          </div>
          <div className="preview-grid">
            <section className="preview-next">
              <span className="preview-label"><Sparkles /> YOUR NEXT BEST MOVE</span>
              <div className="preview-task">
                <span><CheckCircle2 /></span>
                <div>
                  <small>TRAIN FOR MY FIRST 10K</small>
                  <b>Complete an easy 20-minute run</b>
                  <p><Clock3 /> About 20 min <span>+ Running skill</span></p>
                </div>
              </div>
              <button type="button" tabIndex={-1}>Mark complete</button>
              <p className="preview-reassurance">Missed yesterday? Nothing resets. Just continue.</p>
            </section>
            <section className="preview-progress">
              <span className="preview-label"><Target /> YOUR FOCUS GOAL</span>
              <h3>Run 10K without stopping</h3>
              <div className="preview-progress-row">
                <strong>12</strong><span>of 30 training runs</span><b>40%</b>
              </div>
              <i><span style={{ width: "40%" }} /></i>
              <div className="preview-proof">
                <span><CalendarDays /><b>4</b><small>actions this week</small></span>
                <span><Clock3 /><b>2h 15m</b><small>time invested</small></span>
              </div>
              <p><TrendingUp /> Your running consistency is improving</p>
            </section>
          </div>
          <div className="preview-footer">
            <div>
              <Leaf />
              <span><b>Your SkillTree grows from work you actually do.</b><small>Running, endurance and consistency keep developing—even when your goals change.</small></span>
            </div>
            <Link href="/demo">See the full app <ArrowRight /></Link>
          </div>
        </div>
      </section>
      <section className="marketing-home-proof">
        <header>
          <span>NOT ANOTHER TO-DO LIST</span>
          <h2>Planning, action and growth in one place.</h2>
          <p>Most apps forget the work when a task is checked off. SkillTree connects today&apos;s action to the person you are becoming.</p>
        </header>
        <div>
          <article><Target /><b>Decide what matters</b><p>Flexible goals hold a precise target or an open-ended direction.</p></article>
          <article><CheckCircle2 /><b>Do the next useful thing</b><p>Quests, habits and focus sessions turn intention into action.</p></article>
          <article><Leaf /><b>Keep what you gained</b><p>Skills and history remain even when a goal changes or ends.</p></article>
          <article><BarChart3 /><b>Learn from real patterns</b><p>See time, consistency, progress and stronger skill branches.</p></article>
        </div>
      </section>
      <section className="marketing-use-cases">
        <header>
          <span>MADE FOR REAL LIFE</span>
          <h2>See how it fits your goal.</h2>
          <p>Open an example to follow the exact loop from intention to visible progress.</p>
        </header>
        <div>
          {[
            {icon:<Dumbbell />,title:"Run my first 10K",goal:"Distance goal · 30 training runs",next:"Complete an easy 20-minute run",proof:"Track distance, active time and consistency without losing progress after a missed week.",skills:"Running · Endurance · Recovery"},
            {icon:<GraduationCap />,title:"Become conversational in Spanish",goal:"Frequency goal · 4 sessions each week",next:"Finish a 15-minute listening exercise",proof:"Combine lessons, speaking practice and journal notes into one long-running learning record.",skills:"Spanish · Listening · Conversation"},
            {icon:<PiggyBank />,title:"Build a £3,000 emergency fund",goal:"Private currency goal · £1,250 saved",next:"Review this week's spending and transfer £50",proof:"Record contributions and financial habits while keeping all amounts private.",skills:"Budgeting · Planning · Consistency"},
            {icon:<Palette />,title:"Develop my illustration practice",goal:"Open-ended creative direction",next:"Complete one 25-minute character study",proof:"Build a portfolio of activity and evidence without forcing creative growth into a fake deadline.",skills:"Drawing · Observation · Visual storytelling"},
          ].map((item,index)=>(
            <details key={item.title} open={index===0}>
              <summary><span>{item.icon}</span><b>{item.title}</b><small>{item.goal}</small><ChevronDown /></summary>
              <div>
                <p><strong>Next action</strong>{item.next}</p>
                <p><strong>What you learn</strong>{item.proof}</p>
                <p><strong>Skills that grow</strong>{item.skills}</p>
              </div>
            </details>
          ))}
        </div>
      </section>
      <section className="marketing-story">
        <div>
          <span>ONE COHESIVE DAILY LOOP</span>
          <h2>Choose. Do. Record. Grow.</h2>
          <p>
            SkillTree turns a big life direction into one useful next action,
            then keeps the durable record as goals evolve.
          </p>
          <Link href="/features">
            See how the system works <ArrowRight />
          </Link>
        </div>
        <ol>
          <li>
            <b>Choose a focus</b>
            <span>A goal that matters now</span>
          </li>
          <li>
            <b>Complete a real action</b>
            <span>A quest, habit, session or activity</span>
          </li>
          <li>
            <b>Build lasting skills</b>
            <span>Evidence-backed progression and insights</span>
          </li>
        </ol>
      </section>
      <section className="marketing-learn">
        <h2>Explore a better way to track growth</h2>
        <div>
          {[
            ["Goal tracking", "/learn/goal-tracking"],
            ["Skill development", "/learn/skill-development"],
            ["Real-life RPG", "/learn/real-life-rpg"],
            ["Personal skill trees", "/learn/personal-skill-tree"],
            ["Habit progression", "/learn/habit-progression"],
            ["Life goals", "/learn/life-goals"],
            ["Progress tracking", "/learn/progress-tracking"],
          ].map(([label, href]) => (
            <Link href={href} key={href}>
              <BookOpen />
              {label}
              <ArrowRight />
            </Link>
          ))}
        </div>
      </section>
      <Cta />
    </MarketingShell>
  );
}
