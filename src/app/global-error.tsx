"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="onboard">
          <section>
            <article className="onboard-card narrow">
              <h1>SkillTree hit an unexpected problem</h1>
              <p>The problem has been reported without your private notes or evidence.</p>
              <button className="primary" onClick={() => location.reload()}>
                Try again
              </button>
            </article>
          </section>
        </main>
      </body>
    </html>
  );
}
