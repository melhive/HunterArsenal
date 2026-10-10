# HunterArsenal Security and Data Recovery Review

Review date: 2026-10-11

This is a static review of repository code and targeted regression tests. It is not a penetration test, browser exploit assessment, or assurance that the application is secure in every deployment.

## Persistence inventory

- `hunterarsenal.v3` in `localStorage` stores the current application state: profile fields (including optional avatar data URL, birthdate, and lifespan), habits and descriptions, skills, completion and daily history, streak/freeze records, unlocks, Hunter Credit purchase records, settings, and release metadata. XP and Attribute/Mastery progression are represented by completion/history data and derived by the game engine.
- `hunterarsenal.v2` is a legacy migration source. It is retained until the migrated current record has been serialized, written, and read back successfully.
- `hunterarsenal.install.v1` records that a valid state has been initialized. It is written only after the state candidate is verified; if it survives while both current and legacy data are missing, startup enters recovery instead of treating the installation as new. Erasure of the marker and every state copy remains indistinguishable from first installation.
- `hunterarsenal.recovery.v1` stores one bounded snapshot envelope containing the exact prior current-state bytes and prior install marker, plus a SHA-256 digest for the candidate. `hunterarsenal.recovery.commit.v1` records the candidate digest after the candidate and marker have been verified. These keys are a bounded journal, not an independent writable copy of current state.
- `hunterarsenal.lock.v1` stores App Lock configuration, including salted passcode hash and optional authenticator identifier/configuration. It is separate from game state.
- Cache Storage contains the service-worker app shell and same-origin GET assets. The service worker does not intentionally cache local user progress or make cross-origin requests.
- Browser local storage is plaintext and available to scripts running in the same origin/profile. App Lock is a local screen/access lock; it does not encrypt stored progress or protect data from a person with developer-tools/profile access.

## Recovery and write safety

`js/storage.js` distinguishes an absent record from an unreadable, invalid, incomplete, or unmigratable record. Absent data may produce in-memory defaults. A present record enters recovery if parsing/schema checks fail or normalization would alter meaningful persisted values. Arbitrary caps on habits, skills, skill logs, completions, and purchases have been removed. Recovery preserves readable raw records for export and blocks ordinary saves and subsequent `load()` calls. Startup processing and background saves are gated while recovery is active.

### v2.6.0 timestamp compatibility correction

The profile creation timestamp validator and normalizer previously disagreed: normalization replaced timestamps earlier than 2000-01-01 with a generated timestamp, while current-schema validation rejected them. The legacy profile check only required a finite timestamp, so migration could also rewrite a valid zero timestamp. The v2.6.0 correction accepts nonnegative profile creation timestamps through the existing one-day future bound and preserves their exact numeric value during normalization. Negative, non-finite, and excessively future timestamps remain rejected. Other validation rules are unchanged. Regression coverage migrates a v3 record containing a custom profile name, false settings, zero timestamps, a completion, purchase, unlock, habit, and Daily Mission state, then reloads its current-format result. The repository does not contain browser localStorage data, so the exact field in any individual user record cannot be confirmed from repository inspection alone.

The recovery screen offers backup restore, a download of readable raw recovery records, and an explicit confirmed reset. A backup is parsed, schema-checked, normalized only after validation, and staged before confirmation. Failed schema validation or unsafe normalization leaves the current record untouched. Writes are validated and serialized before storage changes. Before replacing the current state, the store writes and reads back one snapshot of the exact prior current bytes and marker. It then writes and verifies the candidate, ensures the initialization marker, and writes/read-back verifies a commit record. Startup accepts a candidate only when it matches the snapshot digest, passes current-schema validation, and has a matching commit record. Otherwise it restores the exact prior bytes; if the state is ambiguous or restoration cannot be verified, it preserves the available records and enters recovery. The commit is removed and verified absent before the snapshot is retired, so an interruption during cleanup conservatively restores the previous state. The checksum is for accidental corruption detection, not authentication. Legacy migrations preserve their source until the current record is verified. Explicit reset is the only app flow that intentionally replaces existing game state with defaults, and both normal reset and App Lock forgotten-passcode reset require the user to enter a fresh random five-digit code.

The save path compares the stored bytes with the last bytes loaded or written by that tab, which rejects stale sequential cross-tab writes. This is not an atomic multi-tab lock: two tabs can still interleave between comparison and write. The journal is bounded to one snapshot and one commit record; if the snapshot cannot be written and read back (including quota failure), the candidate write is not attempted. A failed rollback leaves the journal available for a fresh startup to retry. If localStorage cannot read or write the needed keys, recovery remains blocked until the storage becomes available or the user exports available raw records. A full prior-state snapshot consumes additional quota, so a save can fail safely when there is insufficient space.

No browser API can guarantee recovery from physical device failure, browser profile deletion, storage eviction, a compromised same-origin script, or a storage implementation that both corrupts and refuses rollback. Keep an independent backup for important progress.

## App Lock and backup protection

- App Lock is a screen lock, not data-at-rest encryption. Device/browser profile access can bypass the UI and read localStorage.
- Encrypted backups use Web Crypto PBKDF2-SHA-256 (600,000 iterations) to derive a key and AES-256-GCM with a random 16-byte salt, 12-byte IV, and versioned additional authenticated data. The passphrase is not stored; losing it makes that encrypted backup unrecoverable. The reader bounds accepted iteration counts to avoid unreasonable work from hostile files.
- The application also supports user-initiated plaintext JSON export/import. Such files contain user progress and should be stored privately. Recovery exports preserve raw storage bytes and are also plaintext.
- Import validates the envelope and data structure before normalization, rejects records that would be meaningfully rewritten, and does not persist until the user confirms restore. Invalid imports leave the active saved record unchanged.

## Dynamic content and script policy

Static inspection found dynamic HTML templates in the app, App Lock, and System Notice. User-entered habit/profile text is escaped before HTML interpolation or assigned through text APIs in the reviewed paths; persisted/imported values are normalized by the storage layer. System Notice documents that `bodyHTML` must be escaped by its caller. Its currently inspected callers use app-controlled templates and escape dynamic user values. Avatar display accepts only constrained base64 image data URLs. This was a targeted source review, not exhaustive runtime fuzzing; continue to treat future interpolated data as untrusted.

`index.html` sets a meta CSP with same-origin scripts, no `unsafe-eval`, `object-src 'none'`, `base-uri 'self'`, and `form-action 'none'`. Inline style attributes are permitted by `style-src 'unsafe-inline'` and are used by the current templates. The app loads local scripts and the service worker restricts requests/caching to same-origin GETs. The policy was not weakened in this pass.

## Dependency review

Dependency audit not applicable because this repository has no package-managed dependency manifest or package manager configuration. No dependencies were installed.

## Findings and residual risk

| Severity | Finding |
|---|---|
| Critical | None identified in the reviewed static scope. |
| High | Simultaneous multi-tab writes are not atomic; a narrow interleaving can still overwrite a newer update. localStorage can be cleared or evicted, and a journal write may fail for quota/storage reasons; those cases block writes but cannot guarantee recovery if every available copy is lost or inaccessible. |
| Medium | Local progress, profile data, App Lock settings, plaintext exports, and recovery exports are not encrypted at rest. A compromised same-origin script or access to the browser profile can read them. |
| Low | Inline style is permitted by CSP. Dynamic `innerHTML` remains present and depends on caller escaping/trusted templates. Review every new interpolation. |
| Informational | This client-only app has no backend authorization boundary or cloud secrets. Local data can be edited by the device owner; server-side anti-tamper is not applicable. This review did not include penetration testing or real-browser exploit testing. |
