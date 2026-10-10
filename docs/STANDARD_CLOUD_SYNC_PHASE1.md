# Standard Cloud Sync — Explicit Snapshot Transfers

## Security and phase boundary

The standard-sync snapshot is **plaintext JSON** stored in `public.hunterarsenal_standard_snapshots`. HTTPS, Supabase Auth, row-level security, and compare-and-swap writes protect transport, account authorization, and revision integrity. They do **not** provide end-to-end encryption. Supabase project operators and database roles with sufficient privileges can read snapshot contents.

The separate `public.hunterarsenal_vault` table remains reserved for the encrypted-vault format. The standard-sync migration does not alter it. No service-role or secret key is used by browser code.

Settings → Data & Sync connects `Sync Now` to the state already held by the running app and compares it with the authenticated cloud row. It does not call `Store.load()` again. Comparison alone changes neither copy. Upload requires a separate user confirmation; replacing a different cloud snapshot is unavailable until that cloud copy is downloaded. Restore requires a separate user confirmation and a downloadable local backup first, then writes the fully validated current-schema candidate through `Store.restore()` and its recovery journal. The sync adapter itself never reads/writes localStorage or calls Store persistence methods. Upload re-reads the current cloud revision immediately before its CAS write; restore also checks that the reviewed cloud revision is still current. A changed revision returns a conflict and is never retried automatically. Local state changing after comparison cancels the transfer and requires a new comparison. Offline, Auth, validation, and remote write failures leave local state alone. Automated tests use synthetic fixtures and an in-memory fake Auth/data provider only; they never read app localStorage or call the real Supabase endpoint.

The Settings UI warns that privileged operators could read standard cloud progress. No live Supabase calls, SQL execution, or actual user-progress transfer were part of implementation or automated tests. The migration remains a separate manual prerequisite; sync is not ready for real progress until it is applied to the intended project and an explicitly confirmed end-to-end transfer succeeds.

## Snapshot contract

Each row is owned by the Auth user through `user_id = auth.uid()` and contains one CAS revision plus a snapshot with:

```json
{
  "app": "HunterArsenal",
  "format": "standard-cloud-snapshot",
  "formatVersion": 1,
  "schemaVersion": 4,
  "state": { "v": 4 }
}
```

The actual `state` must pass the current full `HA.Store.validateInput(..., { requireCurrent: true })` validator. The SQL constraint checks the format and schema markers; the client performs full validation before download candidates are returned. No normalization or migration is done by the sync adapter.

The separate table grants authenticated users SELECT only. Writes use a `SECURITY DEFINER` compare-and-swap RPC owned by `postgres`; the function derives ownership only from `auth.uid()`. RLS is enabled and forced, anonymous privileges are revoked, and direct authenticated INSERT/UPDATE/DELETE are unavailable. Revoking table grants does not disable the Supabase `service_role` RLS bypass.

## Future end-to-end encryption transition

The versioned wrapper and preserved schema version allow a later client to validate and export a standard snapshot, serialize its exact `state`, encrypt it using the approved `js/cloud-crypto.js` format, and write it to the separate encrypted vault with revision checks. The transition must verify decryption and state validation before asking the user to delete any plaintext standard snapshot. Until that separately reviewed migration exists, standard cloud snapshots remain plaintext and must not be described as end-to-end encrypted.

## Preconditions before any real-progress test

1. Review and manually apply `supabase/migrations/20261011000200_create_standard_sync_snapshots.sql` to the intended project.
2. Verify the resulting table, RLS policies, grants, function owner, and CAS behavior with synthetic records only.
3. Complete a synthetic end-to-end browser test with the migration applied before choosing an upload or restore for actual progress.

Real progress must not be sent until all four preconditions are satisfied and the user explicitly confirms the compared operation.
