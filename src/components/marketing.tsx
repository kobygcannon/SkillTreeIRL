import Link from "next/link";
import { ArrowRight, Check, Leaf, Sparkles } from "lucide-react";

export const marketingNav = [
  ["Features", "/features"],
  ["SkillTree", "/skilltree"],
  ["Goals", "/goals"],
  ["Examples", "/examples"],
  ["Pricing", "/pricing"],
] as const;
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="marketing">
      <header className="marketing-nav">
        <Link href="/" className="marketing-logo">
          <span>
            <Leaf />
          </span>
          <b>SkillTree</b>
          <em>IRL</em>
        </Link>
        <nav aria-label="Marketing">
          {marketingNav.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div>
          <Link href="/sign-in">Sign in</Link>
          <Link className="marketing-button" href="/sign-in?mode=signup">
            Start free
          </Link>
        </div>
      </header>
      {children}
      <footer>
        <div>
          <b>SkillTree IRL</b>
          <p>Real progress, permanently yours.</p>
        </div>
        <nav aria-label="Footer">
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
      <Sparkles />
      <h2>Start with one goal. Grow from there.</h2>
      <p>
        Your private SkillTree is free to begin, and your history remains yours.
      </p>
      <div>
        <Link className="marketing-button" href="/sign-in?mode=signup">
          Create your SkillTree <ArrowRight />
        </Link>
        <Link href="/demo">Explore the demo</Link>
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
  sections: Array<{ title: string; body: string; points?: string[] }>;
}) {
  return (
    <MarketingShell>
      <section className="marketing-page-hero">
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{intro}</p>
        <div>
          <Link className="marketing-button" href="/sign-in?mode=signup">
            Start free <ArrowRight />
          </Link>
          <Link href="/demo">See a working example</Link>
        </div>
      </section>
      <section className="marketing-sections">
        {sections.map((section) => (
          <article key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
            {section.points && (
              <ul>
                {section.points.map((point) => (
                  <li key={point}>
                    <Check />
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </section>
      <Cta />
    </MarketingShell>
  );
}
