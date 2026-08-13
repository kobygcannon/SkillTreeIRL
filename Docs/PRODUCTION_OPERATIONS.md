# SkillTree IRL production operations

## Environments

Maintain separate Supabase and hosting projects for `staging` and `production`. Never share service keys, OAuth applications, Stripe webhook secrets, evidence buckets, or databases. Set `APP_ENV` and immutable `APP_RELEASE` in every deployment. Staging receives a release only after the application and clean-database quality jobs pass.

Create protected GitHub environments named `staging` and `production`. Require a human reviewer for `production`. Each environment must define its own `VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, and `SUPABASE_DB_PASSWORD`; production additionally defines `PRODUCTION_URL` for rollback verification. Environment-owned Vercel configuration contains the runtime variables from `.env.example`. Never put staging values in the production environment or vice versa.

Configure every legal/controller variable documented in `.env.example` before public registration. In `APP_ENV=production`, `/health/ready` fails closed when the legal identity, controller, retention, lawful-basis, or error-monitoring configuration is missing.

Set `RATE_LIMIT_SECRET` to an independent random secret of at least 32 bytes. The request boundary enforces IP-and-session contextual limits for authentication, recovery, uploads, search, public links, integration callbacks, and API mutations. Cookie-authenticated mutations require a same-origin browser request; signed Stripe and internal worker callbacks are explicitly exempt from origin checks and remain protected by their own signature or bearer-secret verification. Production readiness fails closed if rate-limit storage or configuration is unavailable.

## Monitoring

Set `ERROR_MONITOR_URL` to an HTTPS production ingestion endpoint and `ERROR_MONITOR_TOKEN` to its restricted write token. Production readiness rejects a missing token, malformed endpoint, or non-HTTPS endpoint. Server crashes, handled API failures, frontend crashes, failed jobs, and provider failures are reported with environment and release. Reports exclude request bodies, cookies, authorization headers, journal text, evidence, notes, tokens, and passwords. Alert on sustained HTTP 5xx, failed workers, readiness failures, webhook dead letters, and provider degradation.

## Backups and restore

Enable Supabase automatic daily backups for both environments and point-in-time recovery for production. Evidence lives in the private `evidence` bucket; enable the provider's storage durability/versioning policy and keep source evidence private during recovery.

Monthly restore test:

1. Record backup ID, production release, and migration head.
2. Restore into a new isolated recovery project—not production.
3. Rotate/resynchronise database credentials after physical restore.
4. Apply any later backward-compatible migrations.
5. run `/health/ready`, the hostile RLS suite, and sampled owner/isolation checks.
6. Verify evidence objects can be signed by their owners and cannot be read by another account.
7. Record recovery point, recovery time, row-count reconciliation, evidence sample results, tester, and date in `Docs/restore-tests/`.
8. Destroy the recovery project and revoke temporary credentials.

A launch gate is not satisfied until a dated restore-test record exists for the production backup configuration.

## Deployment

The quality workflow installs the lockfile, runs unit/accessibility tests, lint/type checks, builds the optimized app with its test environment injected first, recreates the database from migrations, lints SQL, and executes RLS/integration tests. The staging workflow deploys only after that workflow succeeds, applies the tested migrations to the isolated staging database, and verifies the exact release through live, ready, and sign-in probes. A successful staging run queues the production workflow; the protected `production` environment supplies the required human approval. Production applies only the same backward-compatible migration set, builds the same commit, verifies `APP_RELEASE`, and performs the same smoke probes.

## Rollback

Application rollback: run the protected `Roll back production application` workflow with the preceding immutable Vercel deployment URL/ID, its expected `APP_RELEASE`, and the incident reason. The workflow promotes that deployment, verifies `/health/live`, checks the expected release, and verifies `/health/ready`. Monitor error rate after completion. Database migrations must be backward compatible. Destructive changes use expand → dual compatibility → backfill → switch → later contract; never roll back application code across an incompatible contracted schema. For data corruption, stop writes, preserve logs, select a verified recovery point, restore to isolation first, reconcile, then perform the documented provider restore.

## Incident priorities

- P0: cross-account exposure, ledger corruption, unrecoverable writes—disable affected writes immediately.
- P1: authentication or core daily loop unavailable—roll back and communicate status.
- P2: optional provider degraded—mark that integration degraded while the core app stays available.
