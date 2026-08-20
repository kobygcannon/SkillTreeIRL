import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  EyeOff,
  History,
  Leaf,
  Menu,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

export const marketingNav = [
  ["How it works", "/features"],
  ["SkillTree", "/skilltree"],
  ["Goals", "/goals"],
  ["Examples", "/examples"],
  ["Pricing", "/pricing"],
] as const;

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="marketing">
      <header className="marketing-nav">
        <Link href="/" className="marketing-logo" aria-label="SkillTree IRL home">
          <span><Leaf /></span>
          <b>SkillTree</b>
          <em>IRL</em>
        </Link>
        <nav aria-label="Marketing">
          {marketingNav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
        <div>
          <Link href="/sign-in">Sign in</Link>
          <Link className="marketing-button" href="/sign-in?mode=signup">Start free</Link>
        </div>
        <details className="marketing-mobile-menu">
          <summary aria-label="Open navigation"><Menu /></summary>
          <nav aria-label="Mobile marketing">
            {marketingNav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
            <Link href="/sign-in">Sign in</Link>
          </nav>
        </details>
      </header>
      {children}
      <footer>
        <div>
          <Link href="/" className="marketing-logo"><span><Leaf /></span><b>SkillTree IRL</b></Link>
          <p>Build a life you can see growing.</p>
        </div>
        <nav aria-label="Footer">
          <Link href="/features">How it works</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/security">Security</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/support">Support</Link>
        </nav>
      </footer>
    </main>
  );
}

export function Cta() {
  return (
    <section className="marketing-cta">
      <span><Sparkles /> START SMALL. KEEP THE PROOF.</span>
      <h2>Give one goal a clear next step.</h2>
      <p>Free includes the complete daily loop. No card required and no progress held hostage.</p>
      <div>
        <Link className="marketing-button" href="/sign-in?mode=signup">Start with one goal <ArrowRight /></Link>
        <Link href="/demo">Explore a working demo</Link>
      </div>
    </section>
  );
}

type MarketingSection = { title: string; body: string; points?: string[] };

function ProductWindow() {
  return (
    <section className="marketing-product-window" aria-label="Example SkillTree workflow">
      <div className="product-window-bar">
        <span><i /><i /><i /></span>
        <b>Today</b>
        <small>Private workspace</small>
      </div>
      <div className="product-window-body">
        <div className="product-window-main">
          <span className="marketing-kicker"><Sparkles /> RECOMMENDED NEXT</span>
          <h3>Write the first 300 words</h3>
          <p>Linked to <b>Finish my first short story</b> and the Writing skill.</p>
          <div className="product-window-meta"><span><Clock3 /> 25 min</span><span><Target /> One clear outcome</span></div>
          <button type="button" tabIndex={-1}>Complete and record progress</button>
        </div>
        <aside>
          <span className="marketing-kicker"><TrendingUp /> THIS WEEK</span>
          <strong>1,240</strong><small>words written</small>
          <i><span /></i>
          <p>Four sessions moved this goal forward. Nothing resets after a missed day.</p>
        </aside>
      </div>
      <div className="product-window-foot">
        <span><Leaf /><b>Writing</b><small>Growing from 18 recorded actions</small></span>
        <span><History /><b>Permanent history</b><small>Goals can change; the work remains</small></span>
        <span><EyeOff /><b>Private by default</b><small>You choose what is ever shared</small></span>
      </div>
    </section>
  );
}

export function MarketingPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: MarketingSection[];
}) {
  return (
    <MarketingShell>
      <section className="marketing-page-hero marketing-page-hero-v2">
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{intro}</p>
        <div>
          <Link className="marketing-button" href="/sign-in?mode=signup">Start free <ArrowRight /></Link>
          <Link href="/demo">See it with real examples</Link>
        </div>
        <small><Check /> Useful in under a minute <Check /> Your history stays yours <Check /> No streak punishment</small>
      </section>

      <section className="marketing-value-strip" aria-label="Product principles">
        <article><Target /><div><b>One useful next action</b><p>Open Today and know where to begin.</p></div></article>
        <article><History /><div><b>A record that survives change</b><p>Keep the work even when plans evolve.</p></div></article>
        <article><ShieldCheck /><div><b>Private and trustworthy</b><p>Real actions—not purchased progression.</p></div></article>
      </section>

      <ProductWindow />

      <section className="marketing-explorer">
        <header>
          <span>EXPLORE THE DETAILS</span>
          <h2>Simple first. Powerful when you need it.</h2>
          <p>Open a section to see what SkillTree does and why it matters in daily use.</p>
        </header>
        <div className="marketing-accordions">
          {sections.map((section, index) => (
            <details key={section.title} open={index === 0}>
              <summary>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b>{section.title}</b>
                <ChevronDown />
              </summary>
              <div>
                <p>{section.body}</p>
                {section.points && <ul>{section.points.map(point => <li key={point}><Check />{point}</li>)}</ul>}
              </div>
            </details>
          ))}
        </div>
      </section>
      <Cta />
    </MarketingShell>
  );
}
