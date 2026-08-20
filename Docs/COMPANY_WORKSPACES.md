# SkillTree IRL company workspaces

## Product promise

Company workspaces give a team shared direction without exposing an employee’s private development. A user can keep a personal SkillTree and belong to one or more company workspaces. Personal goals, habits, journal entries, evidence, friends, history, XP and achievements are never copied into a company workspace.

## Plans and onboarding

- **Individual Free** starts with one meaningful personal goal and remains useful indefinitely.
- **Individual Pro (£7.99/month)** adds deeper analysis, imports, integrations, reusable templates, developer tools, unlimited active goals and expanded evidence storage. Checkout includes a 14-day trial.
- **Company (£6/person/month, three-seat minimum)** starts with a separate workspace, owner identity, privacy explanation, first objective and member invitations. Checkout includes a 14-day trial.
- An invited person sees the privacy boundary before accepting. The token expires after seven days and works only for the authenticated account with the invited email.

The owner should create the first objective, assign it to specific people, invite a manager, and explain check-in visibility. Onboarding must never imply that personal data becomes available to an employer.

## Roles

| Role | Intended use | Access |
| --- | --- | --- |
| Owner | Accountable company operator | Settings, billing, invitations, objectives and company check-ins |
| Admin | People/operations administrator | Invitations, billing, objectives and company check-ins; cannot silently take ownership |
| Manager | Team lead | Create and assign objectives; view manager-visible check-ins |
| Member | Individual contributor | View objectives and update only their own assignments |

Row-level security enforces membership and roles. Protected ownership, membership and invitation fields cannot be changed through broad table updates. Routes validate roles for clear errors, while the database remains the final boundary.

Invitations are delivered through the configured transactional email provider. A secure copy-link fallback remains visible when delivery fails, and monitoring records the provider failure without receiving the invitee address. Owners can change non-owner roles, suspend access and reactivate members without deleting audit history. Admins cannot modify another admin or grant admin access, and the owner record is immutable.

## Daily use

Managers create outcome-based objectives, explain why they matter, choose a due date and assign named members. Members enter a progress value and concise check-in, choosing manager-only or workspace visibility. Progress and history commit transactionally, preventing partial saves.

Objective creation and every selected assignment also commit in one transaction. The database revalidates every assignee as an active member before writing anything, so an invalid or external user identifier rolls back the entire objective.

Company activity intentionally does not award personal XP. This prevents an employer from turning private motivation into a leaderboard or buying progression.

## Billing lifecycle

Company Checkout bills the greater of three seats or the current active-member count. Stripe metadata contains only the organization identifier. Webhooks reconcile subscription status, seats, renewal date, past-due state and cancel-at-period-end state.

Owners and admins use Stripe’s hosted portal for payment details, invoices, eligible plan/quantity changes and cancellation. The UI shows pending cancellation and does not treat a redirect as authoritative; webhooks are authoritative.

Production Checkout remains disabled unless all live Stripe credentials and the Company price are present. Test keys can never satisfy the production billing gate.

## Privacy, legal and support

- SkillTree is controller for platform operations described in the Privacy Policy.
- An employer will normally be a separate controller for workplace information it requests.
- Employers must provide their own lawful notice and must not use SkillTree for covert monitoring or solely automated employment decisions.
- An owner should transfer ownership or close the workspace before deleting the owning account.
- Support must verify workspace identity and must never disclose personal SkillTree data to a company administrator.

## Responsive behaviour

Desktop uses a persistent workspace rail and two-column objective cards. At tablet width the rail becomes a compact top section and content becomes single-column. At phone width forms stack, navigation wraps, touch targets remain large, and no critical action requires hover.

## Operations checklist

1. Apply migrations to staging, verify tables/functions/RLS, and run Supabase Security Advisor.
2. Run strict TypeScript, lint, tests and the production build.
3. Test creation, duplicate slugs, invite email matching, isolation, roles, check-ins and mobile layouts.
4. Test sandbox Checkout/webhooks for active, past-due, pending cancellation and cancellation.
5. After Stripe live verification, create the live Company price and set the live-only Vercel variable.
6. Verify readiness, Sentry capture and alerts after deployment.
