# Local pre-production restore drill — 2026-08-13

- Environment: isolated local Supabase stack (not production)
- Tester: Codex production-readiness run
- Migration head: `20260813040000_account_deletion_immutable_ledgers.sql`
- Backup format: PostgreSQL custom archive (`pg_dump -Fc`)
- Restore target: newly created isolated database `skilltree_restore_test`
- Restore identity: local `supabase_admin`, without restoring source ownership or grants
- Restore result: successful (`pg_restore` exit status 0)
- Cleanup: isolated restore database and temporary archive removed after reconciliation

## Row-count reconciliation

| Dataset | Source | Restored | Result |
| --- | ---: | ---: | --- |
| Auth users | 17 | 17 | Match |
| Profiles | 17 | 17 | Match |
| Goals | 57 | 57 | Match |
| Activities | 118 | 118 | Match |
| XP ledger rows | 123 | 123 | Match |
| Evidence metadata rows | 13 | 13 | Match |

The logical database restore path and core user-owned data reconciliation passed. This drill does not claim the production launch gate: a dated restore from the configured production backup service, storage-object sample verification, measured RPO/RTO, and provider credential rotation still require the actual staging/production infrastructure.
