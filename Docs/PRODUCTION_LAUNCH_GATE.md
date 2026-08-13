# Production launch gate

Last audited: 13 August 2026

This record maps the specification's production-readiness gate to current authoritative evidence. A checked local gate means the implementation is directly verified; it does not substitute for the three provider-backed launch gates at the end.

## Application and security gates — verified

- Authentication works end-to-end: authenticated Playwright journey covers registration, onboarding, protected routing, and deletion sign-out.
- Authorization and RLS are hostile-tested: `supabase/tests/authorization_rls.test.sql` and the full clean-database suite pass.
- Goal measurement types, revisions, state changes, progress, reversals, skills, XP, quests, habits, achievements, evidence, entitlements, Stripe idempotency, exports, deletion, privacy defaults, notification preferences, offline idempotency, and large-account behavior are exercised by the 130-assertion database suite plus the authenticated browser journey.
- Responsive/public/accessibility behavior: seven Playwright journeys pass, including authenticated and public axe checks; static accessibility tests also pass.
- Clean database: all migrations through `20260813040000_account_deletion_immutable_ledgers.sql` apply from zero and database lint reports no warnings.
- Application quality: 80 unit/static tests, ESLint, TypeScript, and the optimized 95-route Next.js build pass.
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
- [ ] Alerts exist for sustained 5xx, readiness failures, failed workers, dead-letter webhooks, and provider degradation.
- [ ] Automatic daily database backups are enabled in staging and production; production point-in-time recovery is enabled.
- [ ] The private evidence bucket's provider durability/versioning/retention configuration is recorded.
- [ ] A provider backup has been restored to an isolated recovery project and validated for RPO, RTO, row counts, hostile RLS, owner/cross-owner evidence access, and cleanup.
- [ ] Production promotion has passed human approval and exact-release live/ready/sign-in probes.
- [ ] A non-production rollback rehearsal has promoted a prior immutable deployment and passed release and readiness verification.

Do not mark SkillTree IRL production-ready or open public registration until every provider-backed item above has dated evidence.

## Current production readiness probe

At release `888d6f12ccae46543c2bb799547451c31aff7f6b` on 13 August 2026, the production probe verified database connectivity, request protection, and monitoring. It remained intentionally unavailable because legal controller configuration was incomplete. A later release also requires production Resend and VAPID credentials before readiness can pass.
