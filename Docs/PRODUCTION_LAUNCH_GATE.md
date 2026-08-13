# Production launch gate

Last audited: 13 August 2026

This record maps the specification's production-readiness gate to current authoritative evidence. A checked local gate means the implementation is directly verified; it does not substitute for the three provider-backed launch gates at the end.

## Application and security gates — verified

- Authentication works end-to-end: authenticated Playwright journey covers registration, onboarding, protected routing, and deletion sign-out.
- Authorization and RLS are hostile-tested: `supabase/tests/authorization_rls.test.sql` and the full clean-database suite pass.
- Goal measurement types, revisions, state changes, progress, reversals, skills, XP, quests, habits, achievements, evidence, entitlements, Stripe idempotency, exports, deletion, privacy defaults, notification preferences, offline idempotency, and large-account behavior are exercised by the 130-assertion database suite plus the authenticated browser journey.
- Responsive/public/accessibility behavior: seven Playwright journeys pass, including authenticated and public axe checks; static accessibility tests also pass.
- Clean database: all migrations through `20260813040000_account_deletion_immutable_ledgers.sql` apply from zero and database lint reports no warnings.
- Application quality: 92 unit/static tests, ESLint, strict TypeScript, and the optimized 95-route Next.js build pass.
- No mock authentication or client-only authorization is used by the signed-in product. `/demo` is intentionally read-only and routes attempted mutations to signup.
- Legal, privacy, security, and support surfaces exist. Production readiness fails closed unless controller, monitoring, email, web-push, and request-protection configuration are complete.
- Multi-channel reminders support in-app, web push, and idempotent Resend email batches; API validation protects timezone, recurrence, quiet-hours, and channel preferences. Provider outages are isolated and reported.
- Outbound developer webhooks reject private and reserved destinations, disallow redirects, atomically lease deliveries, and safely retry crashed workers.
- Release workflows apply migrations, preserve the tested commit SHA as `APP_RELEASE`, verify the deployed release, and smoke-test live, ready, and sign-in surfaces.
- Rollback is executable through `.github/workflows/rollback.yml` and verifies both health and the expected immutable release.
- A local isolated logical restore drill passed with reconciled core row counts; see `Docs/restore-tests/2026-08-13-local-preproduction.md`.

## Provider-backed launch gates — not yet evidenced

These require inspected provider state. They must remain unchecked until dated evidence is recorded.

- [ ] Protected `staging` and `production` GitHub environments exist, with a required production reviewer and separate secrets.
- [ ] A remote repository runs the green quality workflow for the release commit.
- [ ] The staging workflow has applied migrations to a separate Supabase project and passed exact-release smoke checks on its Vercel deployment.
- [x] Sentry production ingestion is configured with privacy scrubbing, release/environment metadata, source-map authorization, IP storage disabled, and a sanitized staging test event (`0a7293c84aba4350addeb26e9b348ec2`) observed on 13 August 2026.
- [x] Sentry production uptime monitors cover `/health/live` and `/health/ready`; issue email delivery is enabled, and reminders, imports, and webhook workers emit scheduled check-ins with failure and recovery thresholds.
- [ ] A dedicated sustained-5xx metric alert and explicit dead-letter/provider-degradation alerts exist in addition to the readiness and worker monitors.
- [ ] Automatic daily database backups are enabled in staging and production; production point-in-time recovery is enabled.
- [ ] The private evidence bucket's provider durability/versioning/retention configuration is recorded.
- [ ] A provider backup has been restored to an isolated recovery project and validated for RPO, RTO, row counts, hostile RLS, owner/cross-owner evidence access, and cleanup.
- [ ] Production promotion has passed human approval and exact-release live/ready/sign-in probes.
- [ ] A non-production rollback rehearsal has promoted a prior immutable deployment and passed release and readiness verification.

Do not mark SkillTree IRL production-ready or open public registration until every provider-backed item above has dated evidence.

## Current production readiness probe

At release `bba9a18230a10306422184808b98c3d158d33c7c` on 13 August 2026, both Vercel production and staging deployments completed successfully. The production readiness probe verified database connectivity, request protection, Sentry monitoring, Resend email delivery, and VAPID browser push. It remains intentionally unavailable because legal/controller configuration and verified live Stripe billing are incomplete.

## Provider configuration evidence - 13 August 2026

- Separate Supabase production (`ieoadeumyqjfujgtvjvl`) and staging (`ioivxuszgqzetieyokul`) projects contain the full schema. RLS is enabled across public customer tables. Trigger-only `SECURITY DEFINER` functions no longer inherit client execution permission; the provider security advisor no longer reports the public-execution findings.
- Vercel production and Preview use separate Supabase projects and environment metadata. `skill-tree-irl-staging.vercel.app` is bound to the `staging` branch as a stable protected Preview alias. Both environments deployed release `bba9a18` successfully.
- Resend uses the verified `send.fentuvo.com` domain with separate domain-scoped, sending-only API keys for production and staging.
- Web Push uses a generated VAPID keypair stored in Vercel secrets and is reported healthy by production readiness.
- Stripe sandbox contains `SkillTree IRL Pro` at GBP 7.99/month, an isolated restricted staging key, and an active staging webhook destination using the latest stable webhook API version. It listens for checkout completion, subscription create/update/delete/pause/resume, invoice paid, and invoice payment failure. Production billing remains disabled until Stripe business verification and live-mode product/key/webhook setup are complete.
- Supabase Free explicitly reports that project backups are unavailable. Scheduled backups, production PITR, and a provider restore rehearsal therefore remain launch blockers requiring a paid plan.
