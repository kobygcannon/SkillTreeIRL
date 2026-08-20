# Provider and account setup

## Ownership model

Use a company-owned password manager and an operations email on the product domain. Require phishing-resistant MFA for GitHub, Vercel, Supabase, Sentry, Stripe, Google, Apple, domain/DNS, Resend, and the independent backup provider. Keep at least two trusted owners where the provider supports it. Do not use a developer's personal API token as a permanent runtime credential.

## Required accounts

### Required before public launch

1. **GitHub** - source repository, protected environments, Actions, Dependabot/security alerts, production approval.
2. **Vercel** - application hosting, separate environment secrets, domains, schedules, deployment protection, logs, rollback.
3. **Supabase** - separate production and staging projects, Auth, Postgres/RLS, private Storage, paid backups/PITR.
4. **Sentry** - error ingestion, release/source maps, issue alerts, liveness/readiness uptime, worker check-ins.
5. **Stripe** - dedicated SkillTree IRL account, sandbox/test configuration, verified live business, Pro product/price, portal, restricted keys, signed webhooks.
6. **Resend** - verified sending subdomain, separate restricted sending keys, DMARC/SPF/DKIM, bounce/complaint monitoring.
7. **Domain/DNS registrar** - production domain, DNS, security contacts, email authentication, renewal protection.
8. **Independent encrypted object backup destination** - evidence object copies because Supabase database backups exclude object bytes.

### Required only for the corresponding feature

- **Google Cloud Console** for Google sign-in.
- **Apple Developer** for Sign in with Apple.
- Provider developer accounts (for example GitHub OAuth) for each integration enabled in production.
- A public status-page/incident communication provider is strongly recommended before broad launch.

Do not create analytics, CRM, AI, advertising, or extra infrastructure accounts until their data purpose, privacy basis, and operational owner are defined.

## Environment matrix

| Concern | Staging | Production |
| --- | --- | --- |
| Branch | `staging` | `main` |
| Vercel | protected Preview + stable staging alias | production project/domain |
| Supabase | staging project and keys | production project and keys |
| Stripe | dedicated sandbox/test account | same dedicated business account in live mode |
| Sentry | `staging` environment | `production` environment |
| Email | staging key/from address | production key/from address |
| OAuth | staging client/callback | production client/callback |
| Backups | automatic backup + restore sample | daily backup, PITR, independent objects, restore drill |

## Stripe setup

1. Create/select a dedicated **SkillTree IRL** Stripe account; do not mix customers/products with another app.
2. In sandbox/test mode create product **SkillTree IRL Pro** with a recurring GBP Price of **£7.99 monthly**. The application provides a 14-day trial at Checkout.
3. Configure the Customer Portal for payment method updates, invoices, cancellation at period end, and the configured plan. Do not enable unsupported upgrades.
4. Create the staging webhook destination at `https://skill-tree-irl-staging.vercel.app/api/stripe/webhook` using the staging protection bypass where required.
5. Create the production destination at `https://<production-domain>/api/stripe/webhook` only after live business verification.
6. Subscribe to checkout completion, subscription create/update/delete/pause/resume, invoice paid, and invoice payment failed.
7. Use separate least-privilege restricted keys for staging and production. Store keys and webhook secrets only in Vercel's environment-owned secret store.
8. Put the correct Price ID in `STRIPE_PRO_PRICE_ID` per environment and verify a sandbox trial, portal entry, renewal, payment failure, cancellation, event replay, and entitlement removal.
9. Do not enable automatic tax until the business has active tax registrations and the product tax code/legal treatment is reviewed.

## Supabase setup

- Apply committed migrations in order and record the migration head.
- Keep email confirmation enabled and redirect allow-lists explicit per environment.
- Keep social providers disabled in the UI until both credentials and callbacks pass E2E tests.
- Confirm all public customer tables have RLS, exposed views use security-invoker semantics, and privileged functions have explicit grants.
- Keep `evidence` private with MIME/size restrictions and owner-prefix policies.
- Enable scheduled backups in both environments and PITR in production; perform the combined database/object restore runbook before launch.

## Vercel and GitHub setup

- Bind `staging` to the stable staging alias and `main` to production.
- Put provider values only in their intended Vercel environment; never copy production service keys to Preview.
- Set immutable `APP_RELEASE` from the commit and verify it after deployment.
- Protect GitHub `production` with a required reviewer and branch restriction; keep deployment secrets environment-scoped.
- Restore GitHub Actions billing so clean database, hostile authorization, authenticated E2E, staging smoke, promotion, and rollback workflows can run remotely.
- Configure a custom production domain before launch; keep the Vercel URL as an operational fallback, not the marketed canonical URL.

## Sentry setup

- Project: `skilltree-irl-web`; environments: staging and production.
- Store server and browser DSNs appropriately; keep the source-map auth token server/build-only.
- Disable unnecessary IP storage and scrub request bodies, cookies, auth headers, query secrets, journal, evidence, and notes.
- Alert on sustained errors, high error volume, missed workers, dead letters, provider degradation, and liveness failure.
- Monitor `/health/live` for outages and `/health/ready` for launch/configuration readiness. A readiness alarm can remain intentionally open while legal/live billing/backups are incomplete; it must not be mistaken for process downtime.

## Launch-blocking owner actions

- Supply the real legal entity/controller name, address, support/legal contact, governing law, cancellation terms, lawful bases, retention statement, and review date.
- Complete Stripe business verification and approve live product/tax/refund details.
- Upgrade Supabase for scheduled backups/PITR and fund the independent evidence backup destination.
- Accept Google OAuth policy and create environment-specific clients if Google sign-in will launch.
- Complete Apple Developer enrolment and identifiers if Apple sign-in will launch; otherwise keep it disabled.
- Restore GitHub Actions billing and execute staging promotion plus rollback rehearsal.
