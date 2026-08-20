import Link from "next/link";
import { legalConfig, legalConfigurationReady } from "@/lib/legal";
export default function Privacy() {
  const configured = legalConfigurationReady();
  return (
    <Legal title="Privacy policy">
      {!configured && (
        <p role="status" className="gentle">
          Public registration is not open. This draft explains the intended
          processing; complete controller and contact details must be configured
          before registration opens.
        </p>
      )}
      {configured && (
        <p>
          <b>{legalConfig.controller}</b>, of {legalConfig.address}, is the
          controller for SkillTree IRL. Contact: {legalConfig.contact}.
        </p>
      )}
      <p>
        We process account, goal, activity, skill, evidence, social,
        integration, billing-status, support, and security data needed to
        provide and protect the service. Our lawful bases are{" "}
        {legalConfig.lawfulBases}. Progress is private by default. Public or
        unlisted profiles expose only the snapshot you choose to publish.
      </p>
      <p>
        <b>Company workspaces are isolated from personal SkillTrees.</b>{" "}
        Workspace members can see the company identity, shared objectives and
        information intentionally submitted to that workspace according to their
        role. Company owners and managers cannot access personal goals, journal
        entries, private evidence, friendships or personal history. Where an
        employer invites you, it will normally be an independent controller for
        the workplace information it asks you to provide.
      </p>
      <p>
        You can export your information or permanently delete your account from
        the product. You may also request access, correction, restriction,
        objection, portability, or withdrawal of consent where those rights
        apply. Private evidence is served through short-lived signed links.
        OAuth tokens and webhook secrets are encrypted at rest.
      </p>
      <p>
        Service providers process data only to operate authentication, hosting,
        storage, payments, monitoring, and integrations. We do not sell personal
        data or sell XP. {legalConfig.retention}
      </p>
    </Legal>
  );
}
function Legal({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="onboard">
      <header>
        <Link href="/">SkillTree IRL</Link>
        <Link href="/support">Support</Link>
      </header>
      <section>
        <article className="onboard-card narrow">
          <h1>{title}</h1>
          {children}
          <p>
            <small>Last updated {legalConfig.updated}</small>
          </p>
        </article>
      </section>
    </main>
  );
}
