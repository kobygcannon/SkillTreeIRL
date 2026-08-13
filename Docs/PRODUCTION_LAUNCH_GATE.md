# Production launch gate

Last audited: 13 August 2026

This record maps the specification's production-readiness gate to current authoritative evidence. A checked local gate means the implementation is directly verified; it does not substitute for the three provider-backed launch gates at the end.

## Application and security gates — verified

- Authentication works end-to-end: authenticated Playwright journey covers registration, onboarding, protected routing, and deletion sign-out.
- Authorization and RLS are hostile-tested: `supabase/tests/authorization_rls.test.sql` and the full clean-database suite pass.
- Goal measurement types, revisions, state changes, progress, reversals, skills, XP, quests, habits, achievements, evidence, entitlements, Stripe idempotency, exports, deletion, privacy defaults, notification preferences, offline idempotency, and large-account behavior are exercised by the 130-assertion database suite plus the authenticated browser journey.
- Responsive/public/accessibility behavior: seven Playwright journeys pass, including authenticated and public axe checks; static accessibility tests also pass.
- Clean database: all migrations through `20260813040000_account_deletion_immutable_ledgers.sql` apply from zero and database lint reports no warnings.
- Application quality: 94 unit/static tests, ESLint, strict TypeScript, and the optimized 95-route Next.js build pass.
- No mock authentication or client-only authorization is used by the signed-in product. `/demo` is intentionally read-only and routes attempted mutations to signup.
- Legal, privacy, security, and support surfaces exist. Production readiness fails closed unless controller, monitoring, email, web-push, and request-protection configuration are complete.
- Multi-channel reminders support in-app, web push, and idempotent Resend email batches; API validation protects timezone, recurrence, quiet-hours, and channel preferences. Provider outages are isolated and reported.
- Outbound developer webhooks reject private and reserved destinations, disallow redirects, atomically lease deliveries, and safely retry crashed workers.
- Release workflows apply migrations, preserve the tested commit SHA as `APP_RELEASE`, verify the deployed release, and smoke-test live, ready, and sign-in surfaces.
- Rollback is executable through `.github/workflows/rollback.yml` and verifies both health and the expected immutable release.
- A local isolated logical restore drill passed with reconciled core row counts; see `Docs/restore-tests/2026-08-13-local-preproduction.md`.

## Provider-backed launch gates — not yet evidenced

These require inspected provider state. They must remain unchecked until dated evidence is recorded.

- [ ] Protected `staging` and `production` GitHub environments exist, with a required production reviewer and separate secrets. The environments now exist, production requires `kobygcannon` approval and is restricted to `main`, and staging is restricted to `staging`; neither environment yet contains its required deployment secrets, including staging's Vercel automation-bypass credential.
- [ ] A remote repository runs the green quality workflow for the release commit.
- [ ] The staging workflow has applied migrations to a separate Supabase project and passed exact-release smoke checks on its Vercel deployment.
- [x] Sentry production ingestion is configured with privacy scrubbing, release/environment metadata, source-map authorization, IP storage disabled, and a sanitized staging test event (`0a7293c84aba4350addeb26e9b348ec2`) observed on 13 August 2026.
- [x] Sentry production uptime monitors cover `/health/live` and `/health/ready`; issue email delivery is enabled, and reminders, imports, and webhook workers emit scheduled check-ins with failure and recovery thresholds.
- [x] A production error-volume monitor creates a medium issue above 3 unresolved errors/hour and a high-priority issue above 10. Dead-letter imports/webhooks and provider degradation emit stable severity-tagged Sentry fingerprints connected to the project email alert.
- [ ] Automatic daily database backups are enabled in staging and production; production point-in-time recovery is enabled.
- [x] The private evidence bucket configuration is recorded: production and staging are private, owner-scoped by authenticated RLS, limited to 10 MB, and restricted to JPEG, PNG, WebP, PDF, and plain text. Supabase Storage does not support S3 bucket versioning; deleted objects are permanent, and database backups contain object metadata but not object bytes. An independent object-copy backup is therefore required before launch and remains covered by the restore gate below.
- [ ] A provider backup has been restored to an isolated recovery project and validated for RPO, RTO, row counts, hostile RLS, owner/cross-owner evidence access, and cleanup.
- [ ] Production promotion has passed human approval and exact-release live/ready/sign-in probes.
- [ ] A non-production rollback rehearsal has promoted a prior immutable deployment and passed release and readiness verification.

Do not mark SkillTree IRL production-ready or open public registration until every provider-backed item above has dated evidence.

## Current production readiness probe

At release `a05bba06c26e1b2404f85e44e987ec97182267cd` on 13 August 2026, Vercel production completed successfully and `/health/live` returned healthy with the exact release. The production readiness probe verified database connectivity, request protection, Sentry monitoring, Resend email delivery, and VAPID browser push. It remains intentionally unavailable because legal/controller configuration and verified live Stripe billing are incomplete. The protected staging alias redirects unauthenticated requests to Vercel SSO; exact-release staging smoke evidence must come from the configured automation bypass after GitHub billing is restored.

## Provider configuration evidence - 13 August 2026

- Separate Supabase production (`ieoadeumyqjfujgtvjvl`) and staging (`ioivxuszgqzetieyokul`) projects contain the full schema. RLS is enabled across public customer tables. Trigger-only `SECURITY DEFINER` functions no longer inherit client execution permission; the provider security advisor no longer reports the public-execution findings.
- Vercel production and Preview use separate Supabase projects and environment metadata. `skill-tree-irl-staging.vercel.app` is bound to the `staging` branch as a stable protected Preview alias. Production deployed release `a05bba0`; staging remains protected by Vercel SSO and has a dedicated automation bypass for release workflows.
- Resend uses the verified `send.fentuvo.com` domain with separate domain-scoped, sending-only API keys for production and staging.
- Web Push uses a generated VAPID keypair stored in Vercel secrets and is reported healthy by production readiness.
- Stripe sandbox contains `SkillTree IRL Pro` at GBP 7.99/month, an isolated restricted staging key, and an active staging webhook destination using the latest stable webhook API version. It listens for checkout completion, subscription create/update/delete/pause/resume, invoice paid, and invoice payment failure. Production billing remains disabled until Stripe business verification and live-mode product/key/webhook setup are complete.
- Supabase Free explicitly reports that project backups are unavailable. Scheduled backups, production PITR, and a provider restore rehearsal therefore remain launch blockers requiring a paid plan.
- Production and staging Supabase Auth have the correct environment-specific Site URL, email/password registration, and email confirmation enabled. Their redirect allow-lists are empty and Google and Apple are disabled. Social login must remain hidden until Google/Apple OAuth applications, provider credentials, and explicit callback allow-list entries are configured and tested in both environments.
- An isolated Google Cloud project named `SkillTree IRL` now exists with external OAuth branding drafted. Google requires the account owner to accept the Google API Services User Data Policy before the OAuth client can be created. Apple Developer is not signed in in the available external browser, so Apple identifiers and credentials remain user-authentication blockers.
- Supabase documents that database backups exclude Storage object bytes, deleted Storage objects are not recoverable, and its S3 compatibility layer does not enable bucket versioning. Launch therefore requires a separately retained, encrypted object-copy backup and a combined database-plus-object restore rehearsal; upgrading database backup/PITR alone does not close the evidence durability gate.
