# HunterArsenal — Codex Operating Guide

Before modifying HunterArsenal, read this file and the relevant documentation listed below. This repository is the development/staging copy at `~/Projects/HunterArsenal/hunters-arsenal-dev/`. The user maintains a separate main HunterArsenal folder connected to GitHub and manually transfers approved work there. Work only in this development copy unless the user explicitly directs otherwise; never search for or modify the other copy as part of ordinary project work.

HunterArsenal is an established product with an approved baseline, not a blank project. Evolve it through controlled, explicit, minimal, tested, and verifiable changes. “Improve” is not permission to redesign the application. When uncertain, preserve existing behavior and report the uncertainty.

## Project identity and current implementation

HunterArsenal is a personal habit and progression PWA built around a futuristic System/HUD interface and the HunterArsenal / Human Metamorphosis Program identity. It is local-first and offline-capable. The current implementation includes habits and history, Core XP and progression, five Attributes and Attribute Classes, per-Habit Mastery, Skills, Statistics, Records (including Qualifications, Operations, and Titles), Daily Missions, Hunter Credits, profile and license presentation, settings, local lock/security, and backup/recovery flows. Treat the checked-in implementation as the source of truth for details; do not infer features from aspirations or old release notes.

The current architecture is a static browser application using HTML, vanilla JavaScript, and CSS. `index.html` loads the application modules directly; there is no framework, build step, package-managed dependency setup, or backend in the current repository.

- `js/app.js` owns the application shell, rendering, navigation, and DOM interactions.
- `js/gamification.js` contains progression rules and derived game calculations.
- `js/storage.js` owns local persistence, validation, migration, backup import/export staging, and recovery behavior.
- `js/security.js` implements local App Lock and encrypted backup support.
- `js/systemwindow.js` and `js/hunter-card.js` provide shared notice and license/card behavior.
- `js/version.js` is the version/changelog source used by the page and service worker.
- `css/styles.css`, `assets/`, and `icons/` provide the current visual system and artwork.
- `manifest.json` describes the installable PWA; `sw.js` precaches the app shell and handles same-origin caching/offline responses.

Preserve this architecture. Do not introduce frameworks, build systems, dependencies, backend services, native wrappers, cloud accounts, or replacement persistence/PWA architecture unless the user explicitly requests that change.

## LOCKED PRODUCT BASELINE

The current HunterArsenal implementation is the approved baseline. Unless the user explicitly requests a change, Codex MUST preserve existing behavior and MUST NOT redesign or reinterpret locked systems.

Locked areas include:

- Current UI structure, visual identity, official branding, and navigation.
- History and Yearly Activity.
- Progression systems, Attribute system, Attribute Classes, Attribute XP, Habit Mastery, and XP mechanics.
- Hunter Credits (HC), the HC economy, and Daily Mission mechanics.
- Skills, Records, Qualifications, Operations, and Continuity where implemented.
- Lock screen/security behavior; storage, data-recovery, backup/recovery, PWA, and offline behavior.
- Existing v2.5.0 functionality and professionalization work already completed.

Do not modify these systems during unrelated work. A request to change one system does not authorize redesign of surrounding systems. Do not change HC prices, earning rules, purchase behavior, or economy balance as part of unrelated work.

## Attribute Classes and Habit Mastery are independent

This is a hard architectural rule. Attribute Classes and Habit Mastery are separate systems. Attribute XP is separate from Habit Mastery XP. Attribute Class progression MUST NOT alter Habit Mastery, and Habit Mastery progression MUST NOT alter Attribute Class progression.

The approved Habit Mastery ranks are exactly:

`AWAKENED` → `FORGED` → `HUNTER` → `VETERAN` → `ELITE` → `APEX` → `ASCENDANT`

Do not add, remove, rename, merge, or reinterpret these systems unless explicitly requested. Attribute Classes use the existing implementation and requirements. Do not invent classes or thresholds. When working on Attribute Classes, preserve Habit Mastery; when working on Habit Mastery, preserve Attribute Class progression.

## DATA INTEGRITY — ABSOLUTE RULE

HunterArsenal MUST NEVER silently destroy valid user data. Never silently truncate valid collections, impose arbitrary collection limits, remove valid records, archive valid records to satisfy an implementation limit, replace valid or incomplete persisted values with defaults, fabricate missing persisted data, coerce meaningful values into different values, normalize away meaningful information, or overwrite unsafe persisted state merely to make it pass validation.

If persisted data cannot safely be preserved:

**VALIDATE → REJECT UNSAFE STATE → ENTER RECOVERY**

Do not “fix” corruption by silently deleting information. User data preservation has priority over convenience. An explicitly confirmed user reset is an intentional destructive operation, not permission for automatic data loss.

### P0 Data Preservation Correction — completed and locked

The P0 Data Preservation Correction is complete and is part of the locked architecture. The approved behavior includes:

- Validation before potentially lossy normalization; valid oversized collections are retained.
- Unsafe active-habit overflow is rejected rather than silently archived.
- Strict profile and nested-section validation; valid stored values are preserved.
- Backup imports are validated before staging/restoration, and migration output is validated.
- A migration source remains until the migrated/current record is verified.
- Write candidates are validated and serialized before storage; saved bytes are verified.
- Rollback is verified when attempted; unsafe write or rollback conditions enter recovery.
- Stale-record protection exists where applicable.

Do not reintroduce destructive sanitization or arbitrary collection caps. Do not change recovery behavior during unrelated work. Before changing storage or recovery code, read `docs/SECURITY_AND_DATA_RECOVERY.md` and inspect the current implementation and tests.

## Multi-tab scope

Multi-tab editing is NOT a HunterArsenal product requirement. The product is designed around the user's current local activity and state. Do not introduce distributed tab locking, Web Locks, BroadcastChannel synchronization, cross-tab mutation queues, multi-tab state reconciliation, or other concurrency infrastructure unless explicitly requested.

The current save path includes a stale-record check, but browser `localStorage` does not provide an atomic compare-and-swap; simultaneous writes can still race. This known limitation may remain documented. It is not a reason to redesign storage or make multi-tab atomicity a requirement.

## UI and branding

The current UI and visual identity are locked. Before changing UI, read `docs/HUNTERARSENAL_UI_DESIGN_SYSTEM.md`. Preserve the official HunterArsenal branding and approved visual identity. Do not redesign the shell, navigation, locked screens, or Yearly Activity; introduce a new visual system or unrelated decoration; replace the approved logo; or globally change colors or typography as part of a scoped component request.

For a specific UI request, change only the requested element and necessary supporting code. Preserve everything else. Treat the design-system document as a description of the current implemented design, not a mandate to normalize every difference it records.

## Progression, economy, and PWA boundaries

The existing progression system is locked. Do not introduce currencies, XP types, progression systems, ranks, mastery systems, or reward economies unless explicitly requested. HC remains the existing cosmetic currency/economy.

Preserve PWA installability, `manifest.json`, `sw.js`, offline behavior, the local-first data architecture, and existing caching strategy. Do not introduce Android Studio, Capacitor, native wrappers, backend synchronization, cloud accounts, or cloud databases unless explicitly requested.

## Security and recovery

Security and recovery are established systems. Before modifying persistence, local protection, backup, recovery, or security behavior, read `docs/SECURITY_AND_DATA_RECOVERY.md`. Do not weaken validation, recovery gating, backup validation, write verification, rollback verification, encrypted backup behavior, or existing lock/recovery protections. If a requested change could affect user data integrity, analyze the impact before editing and keep the scope explicit.

## Documentation map

The project documentation consists of this root `AGENTS.md` and:

- `docs/HUNTERARSENAL_UI_DESIGN_SYSTEM.md` — description of the current implemented interface/design system; read before UI changes.
- `docs/PROFESSIONALIZATION_AUDIT.md` — professionalization audit, completed improvements, findings, limitations, and remaining risks. Theoretical future improvements are not implemented features.
- `docs/SECURITY_AND_DATA_RECOVERY.md` — authoritative details on storage integrity, validation, recovery, backups, security, data preservation, and known limitations; read before related changes.
- `docs/MANUAL_DEVICE_QA.md` — manual browser/device QA procedures and checklist. A checklist is not evidence that device checks passed.

The current implementation is the source of truth for what is actually implemented. Documentation must describe implementation accurately; do not invent features because a document mentions them. If documentation conflicts with code, inspect the implementation, report the discrepancy, and do not silently change runtime behavior to match the document. Update documentation for a discrepancy only when requested or when the task explicitly includes documentation synchronization. Explicit current user instructions take priority over older documentation.

## Codex development rules

Before editing, inspect `git status --short`, relevant files, and the authoritative implementation. Understand existing behavior, make the smallest necessary change, follow existing functions/components/utilities/patterns, and avoid unrelated refactors or speculative cleanup. After editing, run relevant checks requested by the task and inspect the final diff. Report exactly what changed; never claim checks that were not run.

One requested feature is one controlled change. “Change X” does not mean redesign X and everything around it. Do not modify unrelated or locked systems to make a change easier unless genuinely necessary. If a broad architectural change is genuinely necessary, explain why and identify affected systems before proceeding beyond the requested scope. If uncertain, preserve existing behavior and report the uncertainty.

## Git safety and development workflow

The user controls commits and pushes. Before changes, run `git status --short` and preserve pre-existing user changes. Never run `git reset --hard`, `git restore .`, or `git checkout .`; never discard user changes, commit automatically, push automatically, or rewrite history. After changes, inspect `git diff --stat`, `git diff --check`, and `git diff`. Commit only when explicitly requested.

Codex works in `~/Projects/HunterArsenal/hunters-arsenal-dev/`, the development/staging copy. The user reviews and approves work and later transfers approved files to the separate GitHub-connected main HunterArsenal folder. Do not automatically transfer files there or modify that other folder.

## Final development principle

HunterArsenal evolves through **CONTROLLED → EXPLICIT → MINIMAL → TESTED → VERIFIABLE** changes. Priorities are: preserve user data; preserve working behavior; preserve locked architecture; preserve locked UI/branding; make the smallest requested change; test it; review the diff; report exactly what changed.

Never silently redesign HunterArsenal. Never silently change locked behavior. Never silently discard user data.
