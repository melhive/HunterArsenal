# HunterArsenal Professionalization Audit

Audit date: 2026-10-08

This is an implementation audit of the existing local-first PWA. It records current capabilities and bounded changes made during this roadmap pass. It is not a redesign proposal.

## Architecture inventory

- **Runtime:** Static HTML, browser JavaScript, CSS; no React/framework, package manager, bundler, or backend service.
- **UI:** `js/app.js` owns rendering, navigation, and DOM event handling. It renders the app shell from templates. Shared sheets use `openSheet()`; queued system notices use `js/systemwindow.js`; transient feedback uses toast components.
- **Rules and progression:** `js/gamification.js` is the pure game engine. Attribute XP/Class progression and per-Habit Mastery XP/ranks are separate calculations. This audit did not change either system.
- **Persistence:** `js/storage.js` validates data in `localStorage` under `hunterarsenal.v3`, migrates the prior v2 key, and stages validated imports before replacement. Invalid/unreadable saved data enters a write-blocked recovery state instead of falling back to saved defaults. There is no cloud account or synchronization backend.
- **Security:** `js/security.js` provides a local screen lock, optional platform authenticator, and passphrase-encrypted backups. The screen lock does not encrypt the app's stored progress data.
- **PWA:** `manifest.json`, `sw.js`, and relative paths support standalone installation and offline app-shell caching. The service worker precaches core code and caches same-origin GET responses.
- **Release handling:** `js/version.js` is the shared version/changelog source consumed by the page and worker.
- **Tests:** `node tests_engine.js` is the existing dependency-free engine and static-contract suite. There is no configured package-based lint, typecheck, or build pipeline.

## Phase 1 — Polish and accessibility

### Design system

See [HUNTERARSENAL_UI_DESIGN_SYSTEM.md](HUNTERARSENAL_UI_DESIGN_SYSTEM.md) for the values extracted from the current stylesheet and component patterns. The app has theme, typography, Attribute, and safe-area tokens, alongside many component-specific literal values. No token normalization or visual changes were made.

### Interaction and empty states

- Sheets now receive initial keyboard focus, trap Tab navigation while open, close with Escape, and return focus to the opener.
- The app root no longer marks every full-screen render as a polite live announcement. Focused status/toast regions remain available for feedback.
- Empty results for filtered Qualifications and Operations now explain that the filter has no matches and suggest changing the filter.
- Existing controls, disabled states, selected states, notices, and toast language remain in place. No broad terminology changes were made.

### Mobile and accessibility

- Existing app shell constrains page-level horizontal overflow; Yearly Activity and filter strips own their intentional horizontal scrolling.
- Existing reduced-motion rules, safe-area handling, focus-visible outlines, semantic buttons, and system-notice focus management were retained.
- The modal focus behavior was improved without changing sheet layout or styling.
- A live device/browser audit for text scaling, orientation, touch-target measurements, and color contrast was not available in this environment. No contrast values were changed without measurement.

### Known consistency gaps

- There is no full spacing, type-size, radius, or elevation token scale; values vary by component.
- Hover, pressed, disabled, and loading treatments differ by component.
- Several content summaries have custom semantics or are SVG-only and would benefit from a screen-reader pass.
- Sheet and System Notice behavior are separate implementations with different close patterns.

## Phase 2 — Reliability and security

### Performance

- The current UI is a bounded phone-width app. History's annual day grid is at most 366 cells. Persisted collection sizes are no longer silently truncated; large datasets may have higher memory/startup costs.
- No profiler or production bundle measurement is configured, so no speculative memoization, virtualization, or dependency changes were made.

### Data and state

- Persisted user data is loaded once and validated/sanitized; XP and Attribute displays derive from the game engine. Attribute Classes and Habit Mastery remain separate.
- HC purchase flow already validates availability and balance through existing shop logic; no second transaction path was introduced.
- Malformed, incomplete, unsupported, or lossy-to-normalize existing data enters recovery. Raw records remain available for export where readable; startup/background processing and normal writes are blocked.
- Arbitrary caps on habits, skills, skill history, completions, and purchases were removed. Current collections are validated before normalization; unsupported records are rejected. Legacy migrations require the documented persisted profile/settings/progression sections and preserve the original source until verified write.
- Saves compare the currently stored bytes with the last loaded/written bytes, validate and serialize candidates, verify read-back, and verify rollback where possible. Imports remain staged until explicit confirmation.
- **v2.6.0 compatibility correction:** profile creation timestamps from 0 through the existing one-day future bound are now validated and normalized without changing their value. The prior 2000 lower bound could reject current-format records, and normalization could replace older legacy timestamps. Regression coverage verifies preservation through v3 migration, verified write, and subsequent load. Other validation rules and product systems are unchanged; the exact field in a particular browser record cannot be established without access to that record.
- **Residual limitation:** simultaneous writes can still race between the stale-byte check and localStorage write; localStorage has no atomic compare-and-swap. Failed rollback recovery snapshots are session-memory only. Browser/device loss, eviction, or same-origin compromise also remain outside this protection. Keep independent backups.

### Offline behavior

- The app shell is precached for first install; same-origin GET responses use stale-while-revalidate; local user data remains available without network access.
- Fixed the background refresh lifetime: the service worker now calls `event.waitUntil()` for the cache refresh while still returning an existing cached response immediately.
- No cloud reconnection or synchronization behavior exists, so none was added.
- Offline behavior was statically inspected and the cache lifetime contract is tested. A real installed-PWA/offline device run was not available here.

### Error handling

- Storage, import, image, encryption, update-check, and share/export operations have local failure handling in their existing flows.
- There is no central runtime error boundary or durable error log. Adding one requires a product decision about user-facing diagnostics and privacy; this pass did not add one.

### Security findings

| Severity | Finding |
|---|---|
| Critical | None identified in the reviewed client code. |
| High | None identified in the reviewed client code. |
| Medium | Habit and profile data are stored in browser localStorage without encryption. App Lock is a screen lock, not data-at-rest protection. Users needing confidentiality should use an encrypted backup and a protected device profile. |
| Low | Inline style attributes are permitted by the current CSP because UI templates use them. Script execution remains same-origin with no `unsafe-eval`; imported records are sanitized and dynamic text is generally escaped. |
| Informational | There are no backend endpoints, cloud credentials, or authorization boundaries in this release. Since state is client-side, users can edit their own local data; server-side anti-tamper is not applicable until a backend exists. |

The review was static and scoped to repository code. It was not a penetration test or dependency vulnerability scan; no dependency manifest or automated audit command is configured.

## Phase 3 — Analytics

- Existing History supplies the yearly activity calendar, weekly records, and week summaries from stored completion/schedule data.
- Existing Statistics supplies total check-ins, XP, best Streak, active days, a 30-day daily completion chart, Attribute distribution, and Habit Mastery.
- Existing Attribute Class Overview shows all five independent Attributes, current XP, current class, and tier progression, sorted by current Attribute XP.
- No new metric was added: the existing metrics already cover the requested core questions, and deriving long-term completion trends reliably is limited by historical schedule snapshots and habits that have been added/edited over time.
- Habit Mastery was not modified.

## Phase 4 — Capabilities

### Implemented

- No new product capability was added in this phase. The bounded sheet accessibility and service-worker lifetime fixes improve existing behavior.

### Intentionally deferred

- **Cloud sync:** there is no backend architecture. A future design needs account/authentication, encrypted transport and storage policy, conflict resolution, offline mutation queues/idempotency, account recovery, and a clear source-of-truth model. Do not add this as a client-only shortcut.
- **Cross-device analytics:** defer until sync and historical data completeness can be defined.
- **Additional HC rewards or progression:** current systems already include cosmetic purchases and distinct Attribute/Mastery progressions; additional reward loops need a demonstrated user need and economy review.
- **Recovery improvements:** add browser/device validation for quota pressure, partial/denied storage behavior, backup restore, and recovery across PWA restarts. The code-level recovery state and regression tests are implemented; real-device behavior remains unverified.

## Validation limits

- `node tests_engine.js` covers progression, storage validation/migration/recovery, oversized collections, PWA static contracts, and selected UI source contracts.
- JavaScript syntax checks cover changed application scripts and the service worker.
- No separate lint/typecheck/build commands exist in the repository.
- See [MANUAL_DEVICE_QA.md](MANUAL_DEVICE_QA.md) for the physical browser/PWA checklist. Visual inspection at real mobile/tablet/desktop widths and accessibility-technology testing require a browser/device environment not available in this audit.
