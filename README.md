# HunterArsenal v2.4.0

HunterArsenal is a local-first, offline-capable PWA built with vanilla JavaScript, HTML, and CSS. No build step or backend is required. The GitHub Pages deployment path is `/hunters-arsenal/`; application, manifest, icon, and service-worker URLs are relative to that path.

## v2.4.0

- Habits, Titles, Hunter Credits, and the seven official Habit Mastery levels.
- −2 Core XP per missed Habit without a daily cap; Daily Mission penalties are −20 for an accepted failure and −10 for decline or expiry. A completed mission gives +25 Core XP only.
- Streak Freeze rewards at 3, 7, 30, then every additional 30 qualifying days; maximum bank 10. Rest Day and automatic freeze controls.
- Seven-page Settings hub, nine-section Hunter's Rules, and a five-attribute Versatility radar.
- Hunter Credits cosmetic shop with Display Modes, Photo Borders, and Name Plates.
- Immediate Hunter License rendering with fallbacks, bounded optional asset loading, and photo crop preview controls.
- GitHub Pages-ready PWA manifest, 192/512 icons, maskable variants, and refreshed offline cache.

## Local data and security

Progress is stored on-device in `hunterarsenal.v3`. Records are validated before normalization; unsupported, incomplete, or lossy-to-normalize data enters recovery instead of being silently shortened or replaced with defaults. Large valid collections are retained without the former arbitrary collection caps. A validated backup restore or explicitly confirmed reset is required to resolve recovery. Cross-tab writes use a stale-record check, though browser localStorage does not provide an atomic compare-and-swap guarantee. Recovery snapshots after a failed rollback are held in memory for export while the page remains open; keep independent backups. Encrypted backups use the existing Web Crypto security implementation. Browser storage itself is not encrypted; App Lock is a screen lock, not data-at-rest encryption. Protect exported backups and use a protected device profile.

## Optional deployment assets

The app uses drawn/fallback artwork if these optional deployment assets are absent:

- `assets/branding/hunterarsenal-logo.png`
- `assets/branding/license-art.png` or `license-art-E.png` through `license-art-S.png`
- `assets/characters/hunter-main.png` and `hunter-quest.png`
- Additional local fonts

The PWA icons in `icons/` use the repository's fallback HunterArsenal emblem. Preserve official custom branding assets when merging this release into a deployment that already has them.

## Updating

`js/version.js` is the version and changelog source. `sw.js` pre-caches the application shell and removes older `hunter-arsenal-*` caches on activation. Optional same-origin assets are cached when requested.

## Tests

Run the engine and migration checks with:

```bash
node tests_engine.js
```
