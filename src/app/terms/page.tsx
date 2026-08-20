import Link from "next/link";
import { legalConfig, legalConfigurationReady } from "@/lib/legal";
export default function Terms() {
  const configured = legalConfigurationReady();
  return (
    <main className="onboard">
      <header>
        <Link href="/">SkillTree IRL</Link>
        <Link href="/privacy">Privacy</Link>
      </header>
      <section>
        <article className="onboard-card narrow">
          <h1>Terms of service</h1>
          {!configured && (
            <p role="status" className="gentle">
              Public registration and paid plans are not open. These draft terms
              are published for launch review; the operator’s complete legal
              identity and contact details must be configured before
              registration opens.
            </p>
          )}
          <p>
            {configured ? (
              <>
                These terms form an agreement between you and{" "}
                <b>{legalConfig.entity}</b>, of {legalConfig.address}.{" "}
              </>
            ) : (
              <>These terms describe the intended SkillTree IRL service. </>
            )}
            SkillTree IRL helps users record and reflect on personal progress.
            It is not medical, financial, legal, or professional certification
            advice. Users remain responsible for the accuracy and legality of
            content they submit.
          </p>
          <p>
            Do not abuse the service, attempt unauthorized access, upload
            unlawful content, manipulate progression systems, or interfere with
            other users. We may restrict access where reasonably necessary to
            protect users or the service. Paid plans grant product features;
            they never purchase XP or achievements.
          </p>
          <p>
            <b>Company workspaces.</b> A person’s private SkillTree and a
            company workspace are separate. Workspace owners control membership,
            roles, shared objectives, assignments and company check-ins, but do
            not gain access to personal goals, journals, evidence, friends or
            private history. The organization creating a workspace confirms it
            is authorised to do so, has a lawful basis for workplace data it
            enters, gives members appropriate notices, and will not use
            SkillTree for covert monitoring or automated employment decisions.
          </p>
          <p>
            <b>Company subscriptions.</b> Company plans are billed per purchased
            seat with a three-seat minimum. Owners and admins may manage seats,
            payment details, invoices, cancellation and eligible plan changes
            through the billing portal. Cancellation normally takes effect at
            the end of the paid period.
          </p>
          <p>
            {legalConfig.cancellation} Nothing in these terms limits statutory
            consumer rights or liability that cannot legally be excluded.
          </p>
          <p>
            These terms are governed by {legalConfig.governingLaw}, subject to
            mandatory rights that apply where you live.{" "}
            {configured && (
              <>
                Questions or legal notices may be sent to {legalConfig.contact}.
              </>
            )}
          </p>
          <p>
            <small>Last updated {legalConfig.updated}</small>
          </p>
        </article>
      </section>
    </main>
  );
}
