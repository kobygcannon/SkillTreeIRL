# SkillTree IRL

SkillTree IRL is a production web application for turning real-world goals, activities, quests, habits, and evidence into a permanent personal skill history. The signed-in product is backed by Supabase/Postgres; the public root route is an interactive product tour.

## Local development

Requirements: Node.js 22+, pnpm 11+, Docker Desktop, and Supabase CLI 2.112+.

```bash
pnpm install
supabase start
supabase db reset --local
pnpm dev
```

Copy `.env.example` to `.env.local` and use the values emitted by `supabase status` for local development. Open `http://localhost:3000`.

## Release verification

```bash
pnpm test
pnpm lint
pnpm build
pnpm test:e2e
supabase db lint --local --level warning
supabase test db --local supabase/tests
```

The browser suite runs against the optimized production server. Its public checks cover marketing, signup handoff, the read-only demo, and automated axe checks. CI also recreates the entire database, runs hostile RLS tests, and then exercises registration, onboarding, the authoritative daily loop, goal revision/state transitions, export, accessibility, and account deletion with a disposable user. Never deploy a migration that has not passed a clean reset.

## Production configuration

Configure every variable in `.env.example` in the hosting environment. Also configure Google/Apple providers and redirect URLs in Supabase Auth, create the private `evidence` Storage bucket through the migrations, register the Stripe webhook at `/api/stripe/webhook`, and register the GitHub OAuth callback at `/api/v1/integrations/github/callback`.

Scheduled jobs call the three `/api/internal/jobs/*` routes with `Authorization: Bearer $CRON_SECRET`. The included Vercel schedule covers reminders, imports, and outbound webhook delivery. Use the same routes from another scheduler when deploying elsewhere.

## Security model

- Row-level security isolates all customer records.
- XP, goal progress, quest/habit rewards, achievements, imports, and billing state use restricted server-authoritative paths.
- XP and progress ledgers are immutable; corrections are reversal entries.
- Evidence is stored privately and served with short-lived signed URLs.
- OAuth credentials and webhook secrets are encrypted before persistence.
- MFA, global sign-out, full export, and recent-auth account deletion are supported.

Operational probes are available at `/health/live` and `/health/ready`. Backups, point-in-time recovery, alerting, custom domains, provider credentials, and production secrets must be enabled in the selected Supabase and hosting projects before launch.

The environment separation, monitoring, backup/restore test, deployment, incident, and rollback procedures are in [Docs/PRODUCTION_OPERATIONS.md](Docs/PRODUCTION_OPERATIONS.md). A production launch is intentionally blocked until external monitoring, backups, a dated restore drill, staging, and rollback evidence are configured and verified.
