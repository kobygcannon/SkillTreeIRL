# Application API reference

## Conventions

Application endpoints are versioned under `/api/v1`. They use the signed-in Supabase session unless documented as public/provider/internal. JSON errors use `{ "error": { "code": "...", "message": "..." } }`. Validation failures generally return 422, unauthenticated requests 401, forbidden operations 403, state conflicts 409, quota errors 413, and unavailable providers/configuration 503.

Important POST/PATCH operations accept or generate an idempotency key. Offline-capable callers send `Idempotency-Key`; retry the same logical action with the same key. Never retry a new logical action with an old key.

## Core resources

- `GET|POST /api/v1/goals` - list/create goals. Creation enforces plan and focus limits transactionally.
- `GET|PATCH /api/v1/goals/:id` - owned goal detail/edit.
- `POST /api/v1/goals/:id/progress` - immutable progress event.
- `POST /api/v1/goals/:id/target` - target revision.
- `POST /api/v1/goals/:id/state` - pause, resume, complete, archive, or reopen.
- `GET|POST /api/v1/goals/:id/milestones` and `PATCH|DELETE .../:milestoneId` - milestones.
- `GET|POST|DELETE /api/v1/goals/:id/organization` - tags and relationships.
- `GET /api/v1/skills`, `GET /api/v1/skills/tree`, `GET|PATCH /api/v1/skills/:id`, `POST /api/v1/skills/merge` - durable SkillTree management.
- `GET|POST /api/v1/quests`, `GET|PATCH /api/v1/quests/:id`, `POST /api/v1/quests/:id/complete` - quest lifecycle and idempotent completion.
- `GET|POST /api/v1/habits`, `GET|PATCH /api/v1/habits/:id`, `GET|POST /api/v1/habits/:id/occurrences` - timezone-aware recurring practice.
- `GET|POST /api/v1/activities` - list/log authoritative activity.
- `GET|POST /api/v1/activities/:id/evidence` - private evidence metadata.
- `POST|DELETE /api/v1/evidence/upload` - reserve/cancel an owner-scoped signed upload.
- `GET|POST /api/v1/focus-sessions`, `PATCH /api/v1/focus-sessions/:id` - start, pause, resume, finish, or discard; `status=active` returns running/paused state.
- `GET|POST /api/v1/journal`, `GET|PATCH|DELETE /api/v1/journal/:id` - private journal.
- `GET /api/v1/history` - cursor-paginated event history.
- `POST /api/v1/undo` - reversal-based correction.

## Orientation and analysis

- `GET /api/v1/search?q=` - owner-scoped global search.
- `GET /api/v1/calendar` - range-bounded deadlines, sessions, habits, and reminders.
- `GET /api/v1/insights` - daily/weekly signal for Free; advanced fields are populated only with the backend Pro entitlement.
- `GET /api/v1/year-reviews/:year` - Pro year review generation/read.
- `GET /api/v1/seasons/current` - lifetime-safe seasonal context.
- `GET /api/v1/achievements` - definitions joined to unique unlock state.

## Account, privacy, and communication

- `GET /api/v1/account/preferences`, `PATCH /api/v1/account/preferences` - profile/user preferences.
- `PATCH /api/v1/profile/public` - explicit private/unlisted/public snapshot settings.
- `POST /api/v1/account/export` - complete machine-readable export.
- `DELETE /api/v1/account` - recent-auth deliberate deletion.
- `POST /api/v1/account/sign-out-all` - revoke sessions.
- `GET|PATCH /api/v1/notifications/preferences`, `POST /api/v1/notifications/push` - channel controls and push subscription.
- `GET|POST /api/v1/reminders`, `PATCH|DELETE /api/v1/reminders/:id` - reminders.
- `GET|POST /api/v1/support` - authenticated private support/feedback.

## Social, templates, imports, and integrations

- `/api/v1/friends*`, `/api/v1/people`, `/api/v1/challenges*` - consent-based social graph and challenges.
- `/api/v1/templates*` - curated discovery/instantiation; Pro custom authoring; public submissions enter moderation.
- `/api/v1/imports*` - Pro preview/map/confirm/status pipeline.
- `/api/v1/integrations*` and `/api/v1/integrations/github/*` - Pro provider management, OAuth state, and synchronisation.
- `/api/v1/developer/keys*`, `/api/v1/developer/webhooks*` - Pro scoped credentials and signed outbound events.

## Billing and provider boundaries

- `POST /api/v1/billing/checkout` - creates Stripe subscription Checkout for the configured Pro Price and 14-day trial.
- `POST /api/v1/billing/portal` - opens the Stripe Customer Portal for an existing customer.
- `POST /api/stripe/webhook` - public Stripe-signed idempotent reconciliation endpoint.
- `/api/internal/jobs/reminders|imports|webhooks` - scheduled, bearer-protected workers; not browser APIs.
- `/api/admin/*` - audited role-restricted administration.
- `/health/live`, `/health/ready` - unauthenticated operational probes.

## Company workspaces

- `GET|POST /api/v1/organizations`, `GET|PATCH|DELETE /api/v1/organizations/:id` - list, create, configure, or owner-confirm close isolated workspaces; closure cancels active billing before deletion.
- `POST /api/v1/organizations/:id/invitations` - create an email-bound, hashed, expiring invitation and attempt transactional email delivery.
- `POST /api/v1/organization-invitations/accept` - accept only as the authenticated invited email.
- `PATCH /api/v1/organizations/:id/members/:userId` - protected role changes and reversible member suspension.
- `POST /api/v1/organizations/:id/objectives` - atomically create an objective and validated active-member assignments.
- `POST /api/v1/organizations/:id/objectives/:objectiveId/checkins` - transactionally record a member check-in and assignment progress.
- `POST /api/v1/organizations/:id/billing/checkout|portal` - role-protected Company subscription lifecycle.

## Security requirements for new endpoints

Use the shared authenticated boundary, validate and cap every input, scope every read/write by owner or an audited admin policy, use an authoritative transaction for multi-row changes, revoke default function execution, make retries safe, avoid returning secrets/private content, and add unit/database/hostile/E2E evidence proportionate to risk.
