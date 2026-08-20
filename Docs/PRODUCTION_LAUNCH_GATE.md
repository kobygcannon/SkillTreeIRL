# Production launch gate

Last audited: 20 August 2026

This record maps the specification's production-readiness gate to current authoritative evidence. A checked local gate means the implementation is directly verified; it does not substitute for the three provider-backed launch gates at the end.

## Application and security gates — verified

- Authentication works end-to-end: authenticated Playwright journey covers registration, onboarding, protected routing, and deletion sign-out.
- Authorization and RLS are hostile-tested: `supabase/tests/authorization_rls.test.sql` and the full clean-database suite pass.
- Goal measurement types, revisions, state changes, progress, reversals, skills, XP, quests, habits, achievements, evidence, entitlements, Stripe idempotency, exports, deletion, privacy defaults, notification preferences, offline idempotency, and large-account behavior are exercised by the 130-assertion database suite plus the authenticated browser journey.
- Responsive/public/accessibility behavior: seven Playwright journeys pass, including authenticated and public axe checks; static accessibility tests also pass.
- Clean database: the last isolated reset applied migrations through `20260813040000_account_deletion_immutable_ledgers.sql` and database lint reported no warnings. Later migrations through `20260813230000_complete_focus_sessions.sql` are installed in both provider environments and have passed targeted privilege and transactional rollback verification, but the full clean-reset suite for the new head remains pending while GitHub Actions billing prevents jobs from starting.
- Application quality: 94 unit/static tests, ESLint, strict TypeScript, and the optimized 95-route Next.js build pass.
- No mock authentication or client-only authorization is used by the signed-in product. `/demo` is intentionally read-only and routes attempted mutations to signup.
- Legal, privacy, security, and support surfaces exist. Production readiness fails closed unless controller, monitoring, email, web-push, and request-protection configuration are complete.
- Multi-channel reminders support in-app, web push, and idempotent Resend email batches; API validation protects timezone, recurrence, quiet-hours, and channel preferences. Provider outages are isolated and reported.
- Outbound developer webhooks reject private and reserved destinations, disallow redirects, atomically lease deliveries, and safely retry crashed workers.
- Release workflows apply migrations, preserve the tested commit SHA as `APP_RELEASE`, verify the deployed release, and smoke-test live, ready, and sign-in surfaces.
- Rollback is executable through `.github/workflows/rollback.yml` and verifies both health and the expected immutable release.
- A local isolated logical restore drill passed with reconciled core row counts; see `Docs/restore-tests/2026-08-13-local-preproduction.md`.
- Failed evidence uploads now release their quota reservations and remove unattached private objects; activity and quest attachment flows compensate safely without deleting evidence that was already committed.
- Support updates and moderation actions commit their record change, private note/content action, and audit event atomically. The database re-authorizes the administrator and exposes these functions only to the service role.

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

On 20 August 2026, the latest Vercel production deployment completed successfully and `/health/live` returned HTTP 200 with the exact deployed commit in `release`. `/health/ready` returned HTTP 503 with database, request protection, Sentry monitoring, Resend email delivery, and VAPID browser push healthy; configuration/legal and billing were false. The probe therefore remains intentionally unavailable because legal/controller configuration and verified live Stripe billing are incomplete. The matching staging deployment is Ready, but its stable alias remains protected by Vercel SSO; exact-release HTTP smoke evidence still requires the automation bypass. Always use the current `/health/live` response as the authoritative release identifier rather than this narrative record.

## Provider configuration evidence - 20 August 2026

- Separate Supabase production (`ieoadeumyqjfujgtvjvl`) and staging (`ioivxuszgqzetieyokul`) projects contain the full schema. RLS is enabled across public customer tables. Trigger-only `SECURITY DEFINER` functions no longer inherit client execution permission; the provider security advisor no longer reports the public-execution findings.
- Vercel production and Preview use separate Supabase projects and environment metadata. `skill-tree-irl-staging.vercel.app` is bound to the `staging` branch as a stable protected Preview alias. Production and staging both deployed the audited product/documentation release; staging remains protected by Vercel SSO and requires its automation bypass for release-workflow smoke probes.
- Resend uses the verified `send.fentuvo.com` domain with separate domain-scoped, sending-only API keys for production and staging.
- Web Push uses a generated VAPID keypair stored in Vercel secrets and is reported healthy by production readiness.
- A dedicated Stripe account and isolated sandbox named `SkillTree IRL` were created. The sandbox contains `SkillTree IRL Pro` at GBP 7.99/month and `SkillTree IRL Company` at GBP 6/person/month (the application enforces a three-seat minimum), customer self-service for invoices/payment methods/cancellation at period end, and an active 11-event destination. Sandbox credentials and both Price identifiers are installed only in the Vercel Preview environment. Production billing remains disabled until business verification, live-mode products/keys/webhook setup, legal links, and end-to-end billing tests are complete.
- The operator has identified the legal structure as an England-based individual/sole trader and supplied the legal name `Koby Glenn Cannon`. Legal configuration remains blocked on a genuine correspondence/service address and public support/legal email. Neither value may be invented; the address may be a home address or a legitimate address service the operator is authorised to use.
- The final focus lifecycle migration is installed in both Supabase projects. A full transaction-rollback probe proved pause, resume, complete, idempotent repeated completion, and exactly one authoritative activity; the Supabase Security Advisor shows zero errors in both projects.
- Supabase Free explicitly reports that project backups are unavailable. Scheduled backups, production PITR, and a provider restore rehearsal therefore remain launch blockers requiring a paid plan.
- Production and staging Supabase Auth have the correct environment-specific Site URL, email/password registration, and email confirmation enabled. Their redirect allow-lists are empty and Google and Apple are disabled. Social login must remain hidden until Google/Apple OAuth applications, provider credentials, and explicit callback allow-list entries are configured and tested in both environments.
- An isolated Google Cloud project named `SkillTree IRL` now exists with external OAuth branding drafted. Google requires the account owner to accept the Google API Services User Data Policy before the OAuth client can be created. Apple Developer is not signed in in the available external browser, so Apple identifiers and credentials remain user-authentication blockers.
- Supabase documents that database backups exclude Storage object bytes, deleted Storage objects are not recoverable, and its S3 compatibility layer does not enable bucket versioning. Launch therefore requires a separately retained, encrypted object-copy backup and a combined database-plus-object restore rehearsal; upgrading database backup/PITR alone does not close the evidence durability gate.
