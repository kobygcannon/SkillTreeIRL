# SkillTree IRL product and user guide

## What the product is

SkillTree IRL is a private, long-lived record of real-world growth. It connects outcomes (goals), next actions (quests), repeated practice (habits), actual work (activities and focus sessions), proof (evidence), and durable capabilities (skills). Goals can be revised, paused, completed, or abandoned without deleting the skills and history earned while pursuing them.

It is deliberately not a gamified task list. XP is an audit-backed summary of real action, never a currency for sale. Missed days do not remove XP or levels, break a punitive streak, or shame the user.

## The daily loop

1. Open **Today** and read the recommended next action. The recommendation favours pinned, due, in-progress, and goal-linked work; it remains understandable without AI.
2. Choose one useful action: complete a quest or habit, start a focus session, update measurable goal progress, or log an activity that already happened.
3. Add optional private evidence when it increases confidence: an image, PDF, text note, or secure HTTPS link.
4. Review the immediate result. Authoritative activity, progress, XP, achievements, and history are written by the server. Offline-safe mutations clearly remain pending until confirmed.
5. Use **Insights** weekly, not constantly. Free accounts receive daily and weekly signal; Pro adds longer-range patterns and forecasts.

The product should be useful in under a minute on an ordinary day. Advanced planning, integrations, templates, public sharing, and developer tools stay out of the critical loop.

## Core concepts

### Goals

Goals describe a direction or outcome and support open-ended, numeric, currency, percentage, frequency, duration, milestone, binary, recurring, composite, and custom measurement. A goal may be Focus, Active, Paused, Completed, or Archived. Target changes create revisions; progress creates immutable events; corrections create reversals. Historical values are not silently overwritten.

### Skills and the SkillTree

Skills persist independently of goals. Work may contribute to several skills with explicit allocation. Skill XP comes from ledger transactions, and reversals preserve the audit trail. Skills can be organised into branches, renamed, archived, or merged without destroying their history.

### Quests

Quests are concrete next actions linked to goals and skills. They support due dates, priorities, dependencies, recurrence, evidence requirements, and optional pinning as the next best action. Completion is transactional and idempotent: one completion cannot create duplicate activity or XP.

### Habits

Habits record recurring practice in the user's timezone. A day may be complete, partial, skipped, or missed without punitive loss. Minimum targets and details make the record meaningful. Recurrence and reminders remain editable as life changes.

### Activities

Activities are the canonical record of actual effort. They can include duration, quantity, unit, effort, private notes, goal links, skill allocations, and evidence. Users can undo mistakes through reversal events. Direct client writes cannot bypass authoritative XP and allocation rules.

### Focus sessions

A focus session can relate to a goal or quest. It supports start, pause, resume, finish, and discard. Only active time counts. State survives navigation because the current segment and accumulated seconds are stored server-side. Finishing creates exactly one activity; retrying finish returns the original result.

### Journal and notes

The journal is private and can relate to a goal, activity, skill, or general day. It supports lightweight headings, lists, emphasis, and safe HTTPS links without accepting raw HTML. Lightweight object notes remain distinct from the journal.

### History, insights, seasons, and reviews

History combines activities, progress, goal changes, quest completions, achievements, and corrections in a cursor-paginated timeline. Daily and weekly summaries answer what moved recently. Pro adds 30-day patterns, completion ranges, strongest-skill trends, and year reviews. Seasonal totals add context but never replace lifetime progress.

### Privacy and sharing

Profiles are private by default. A user must intentionally choose unlisted or public visibility. Share cards omit evidence, private notes, financial values, and location. Evidence stays in a private bucket and is accessed through short-lived owner-authorised links.

## First-use journey

1. Create an account and confirm email.
2. Complete the one-to-three-minute onboarding flow: choose an area, name one meaningful goal, and choose how progress should be measured.
3. Land on Today with one focus goal and a clear next action.
4. Log a small real action or create the first quest/habit.
5. Return tomorrow without being punished for any gap.

## Recovery behaviour

- Failed forms retain entered data and show a human-readable retry path.
- Important writes carry idempotency keys and can be retried safely.
- Offline activity/progress is labelled pending and cannot award duplicate progress when replayed.
- Optional provider outages do not block the core manual loop.
- Long-running imports and webhooks are leased, retryable, and dead-lettered with monitoring.
- Global error handling reports sanitised context without journal, notes, evidence, cookies, tokens, or request bodies.

## Account controls

Settings include timezone and locale, theme, reduced motion, game intensity, profile visibility, appearance, MFA, global sign-out, notification channels/quiet hours, data export, billing, feedback, and deliberate account deletion. Deletion explains consequences and requires recent authentication plus the exact confirmation phrase.

## Free and Pro in the interface

Free is not a demo: it includes the complete daily loop, permanent history, the SkillTree, up to ten active goals, unlimited archived/completed history, quests, habits, activities, focus sessions, basic insights, and 25 MB of private evidence.

Pro is for deeper and longer-running use: unlimited active goals, advanced analysis and forecasts, year reviews, imports, integrations, custom templates, developer keys/webhooks, and 250 MB of evidence. Pro never buys XP, levels, achievements, ranking, or essential privacy/security.
