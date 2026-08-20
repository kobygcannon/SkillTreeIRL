# Architecture and authoritative data flows

## System overview

SkillTree IRL is a Next.js 16 application deployed on Vercel. React server components load the authenticated shell; client components provide interactive workflows. Supabase supplies Postgres, Auth, and private Storage. Stripe supplies subscription billing, Sentry supplies error/outage monitoring, Resend supplies transactional email, Web Push supplies browser notifications, and optional OAuth integrations feed the generic integration pipeline.

Production and staging use separate Vercel and Supabase state. Provider credentials, databases, evidence buckets, webhook signing secrets, and OAuth clients must never be shared across environments.

## Application layers

- `src/app`: routes, server-rendered pages, API boundaries, health probes, and provider callbacks.
- `src/components`: user workflows and reusable presentation.
- `src/domains`: testable rules for goals, XP, reminders, entitlements, and insights.
- `src/lib`: Supabase clients, Stripe, security boundaries, monitoring, email, encryption, offline queueing, and shared utilities.
- `supabase/migrations`: versioned schema, policies, triggers, functions, indexes, and grants.
- `supabase/tests`: pgTAP invariants, hostile cross-owner tests, privileges, idempotency, and transactional behaviour.
- `tests/e2e`: public and authenticated browser journeys plus accessibility checks.

## Authentication and request boundary

Supabase Auth owns identity and sessions. Server routes obtain a verified user through the shared authenticated boundary; protected pages redirect when no valid user exists. Cookie-authenticated mutations require a same-origin browser context. Rate limits combine IP and session context. Provider callbacks use their own signature/state validation, and internal jobs require `Authorization: Bearer $CRON_SECRET`.

Authorization never trusts URL IDs, client-provided ownership, display metadata, or hidden controls. Every customer table has RLS. Owner predicates use `auth.uid()`, and multi-row functions independently re-check ownership.

## Authoritative mutation pattern

Important multi-record operations run in Postgres functions and are safe under retries:

- activity logging creates the activity, goal links, skill allocations, XP ledger entries, and trigger-driven derived state;
- quest/habit completion creates exactly one completion and its authoritative rewards;
- focus completion reuses the hardened activity service and stores the resulting activity ID;
- goal progress/target/state changes create event or revision history;
- undo creates reversals instead of deleting ledger history;
- template instantiation, challenge creation, support administration, and moderation commit atomically;
- Stripe webhook events are claimed once and reconciled idempotently.

Clients receive IDs/results only after the authoritative transaction succeeds. A retry with the same idempotency key returns the prior result.

## Data ownership and ledgers

User-owned rows include an owner identifier and are protected by RLS. XP and goal progress are append-only ledgers. Corrections reference original entries. Aggregates and views are derived from these sources and use security-invoker semantics where exposed.

Public profile snapshots contain only intentionally shareable fields. Admin access is role-restricted and audited. Sensitive support content is separated from operational metadata.

## Evidence storage

The `evidence` bucket is private. The server reserves an owner-prefixed path and quota before issuing a short-lived signed upload. The browser uploads directly to Storage, then the server transaction attaches metadata to an owned activity. Failed uploads cancel reservations and remove unattached objects. Allowed formats and the 10 MB per-file limit are enforced independently of plan storage quotas.

Database backups do not contain Storage object bytes. Independent encrypted object copies and a combined restore drill are required for production.

## Offline and long-running work

Supported offline mutations enter a local queue with stable idempotency keys and explicit pending UI. Replay cannot duplicate progress. Imports, outbound webhooks, reminders, and provider normalisation run through scheduled worker endpoints with leases, bounded batches, retry state, dead letters, and monitoring.

Integration flow:

`external event -> encrypted provider connection -> integration event (unique external ID) -> normalisation -> activity -> goal progress -> XP ledger`

An integration outage changes only that integration's status; manual core use continues.

## Observability and health

`/health/live` proves that the deployed application process responds and reports its immutable release. `/health/ready` additionally checks database access, required secrets, request protection, monitoring, email, push, billing, and legal configuration. Production readiness fails closed.

Sentry receives sanitised server/client failures with environment and release. It monitors both liveness and readiness: liveness represents outage, while readiness represents a configuration/launch gate. Worker check-ins and stable fingerprints cover missed schedules, dead letters, and provider degradation.

## Release and rollback

Only a lockfile installation, lint, strict typecheck, unit/accessibility tests, clean database reset, SQL lint/tests, optimized build, staging migration, and smoke test may precede production. Migrations use expand/dual-write/backfill/switch/contract for destructive evolution. Application rollback promotes a known immutable Vercel deployment; data recovery follows the provider restore runbook rather than reverse-writing migrations.
