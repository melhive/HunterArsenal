# HunterArsenal v2.3.0

**What changed from 2.2.0**
- **Daily Mission** (was Directive): set a time once and it arrives every day. "Today" sets a one-off. Missions that are cleared, missed or declined re-arm themselves. Reward +25 Core XP, failing costs 10.
- **Hunter’s License** redesigned on a 1600x1000 canvas following the reference sheets: header and system block, photo with ID mark, name / Hunter ID / issued, class and designation, rank emblem (wings and crown by rank), primary attribute, five attribute rows with tier badges, highest protocol mastery, quote panel, barcode footer. Per-rank palettes: E green, D cyan, C blue, B steel-blue, A violet and gold, S gold. Optional art: `assets/branding/license-art.png` or `license-art-E.png` ... `license-art-S.png`.
- Wording: rank titles end in Hunter (Provisional, Field, Senior, Lead, Principal, Chief); Skills (was Disciplines); Hunter Profile; Human Research Program. Protocols, Designations, Qualifications, Operations, Records, Research Credits, Core XP and Mission Clock are unchanged.
- Settings is regrouped (Hunter, Daily Mission, Display and Sound, Gameplay, Mission Clock, Security, Data, App); the Settings entries on Profile and Records are gone.
- New icon set fixes (dumbbell, swords, apple, runner, mission clipboard) and a flexed-arm muscle icon for Strength.
- Mission Clock sits inside the screen margins with clear corners; the Hunter ID is shown on the profile; the decorative HA-DQ / HA-LC tags are removed; the Versatile hint only shows once earned.
- Transitions: staggered screen entry, tab swaps, progress bars that grow in, press feedback, animated dialogs. Respects reduced-motion settings.
- Security (App Lock, encrypted backups) is unchanged from 2.2.0.

Update your manifest.json `theme_color` and `background_color` to `#0b0e12`.

---


# HunterArsenal v2.1.0: new Home + Core Progression build

Vanilla JS, no build step. Works on GitHub Pages at `/hunters-arsenal/` (all paths are relative).

## IMPORTANT: how to merge into your repo
This build REPLACES these files:
- `index.html`, `sw.js`, `css/styles.css`
- `js/app.js`, `js/gamification.js`, `js/storage.js`, `js/systemwindow.js`, `js/version.js`
- NEW: `js/hunter-card.js`, `assets/fallback/*` (backup art only)

**KEEP your own** `manifest.json`, `icons/`, `assets/branding/`, `assets/characters/`, fonts, `.nojekyll`, `AGENTS.md`.
1. Paste your existing `@font-face` rules at the top of `css/styles.css` (marked "FONT HOOK").
2. If your old `index.html` had `<link rel="apple-touch-icon">` or `<link rel="icon">` lines, paste them into the new `<head>`.
3. The app looks for your art at `assets/branding/hunterarsenal-logo.png`, `assets/characters/hunter-main.png`
   and `assets/characters/hunter-quest.png` (same names as your old build). If a file is missing it falls back to `assets/fallback/`.
4. Your OLD (pre-v2) data is not migrated: this build uses its own storage key (`hunterarsenal.v3`). Data saved by the v2.0 build of this project IS migrated automatically
   (and re-validated). Send me `js/storage.js` from your repo and I will write an importer for your original data.

## Shipping an update
Edit files, bump `APP_VERSION` and add a CHANGELOG entry in `js/version.js`, push. Users refresh once and the app
updates itself (service worker + one automatic reload). Tested: offline use, and update after a single refresh.

## Tests
`node tests_engine.js` runs the progression engine tests (level curve, tiers, versatility, Daily Quest cycle, freezes, import sanitising).

## What v2.1 follows (from your visual plan)
- XP: every habit = +10 Hunter XP, +5 attribute XP, +5 mastery XP. Daily Quest = +25 Hunter XP only. No rank multipliers. Max 8 active habits.
- Levels: Lv13 = 1,500 XP, Lv30 = 6,000, Lv50 = 14,000, Lv70 = 25,000, Lv90 = 38,000, Lv100 = 48,000. Ranks E 1-12, D 13-29, C 30-49, B 50-69, A 70-89, S 90-100.
- Attribute tiers start at 0 / 100 / 400 / 900 / 1,600 XP (class names from the Stats & Class Tiers image).
- Mastery: Awakened 0, Forged 50, Hunter 150, Veteran 400, Elite 700 (my value), Apex 1,000, Ascendant 2,500.
- All of these numbers live in `CONST` at the top of `js/gamification.js`.

## Decisions I made (change any of them)
- Removed the Easy/Normal/Hard picker and the perfect-day XP bonus (they break the flat +10 and the 105 XP/day cap). Streaks and freezes stay, with no XP.
- Header shows "STORAGE: ON-DEVICE" instead of "ENCRYPTION: ON" because browser storage is not encrypted.
- "Habit Completed" is a compact toast instead of a blocking modal; level-ups, rank-ups, class tiers and unlocks use full System Notices.
- Today / Habits / Skills / Bonus stay as a slim tab strip under Today's Quest.
- Not built: reminder notifications (need a server), the Daily Quests "Claim All" list, rep targets (you chose done / not done).
