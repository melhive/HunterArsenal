# HunterArsenal Manual Device QA

Status: **MANUAL DEVICE TESTS — NOT RUN in this environment.** This checklist is preparation for physical devices and installed browsers; it does not imply that these checks passed.

## Android Chrome

- [ ] Fresh install and first launch; confirm a genuinely new profile initializes normally.
- [ ] Reload and restart Chrome; confirm valid progress remains intact.
- [ ] Launch offline after the app shell has been cached.
- [ ] Complete an offline progress action, restart, and confirm it is retained locally.
- [ ] Reconnect after offline use; confirm no duplicate action or unexpected reset.
- [ ] Exercise storage pressure or denied storage and confirm recovery/write-failure messaging without default overwrite.
- [ ] Export a plaintext backup and an encrypted backup; verify privacy/passphrase messaging.
- [ ] Restore valid backups; try malformed, incomplete, and wrong-passphrase files and confirm existing data remains unchanged.
- [ ] Exercise corrupt-record recovery: raw recovery export, valid backup restore, failed restore, and repeated restart while unresolved.
- [ ] Confirm reset requires explicit confirmation and only then initializes a clean state.
- [ ] Check touch target usability, text scaling, portrait/landscape, keyboard/input behavior, and safe areas.

## Installed PWA

- [ ] Install, launch, close, and relaunch; verify progress persists.
- [ ] Update from an older cached release and verify service-worker refresh/reload behavior.
- [ ] Launch offline, navigate between existing screens, and use local features.
- [ ] Verify data remains after PWA restart and update.
- [ ] Verify recovery remains visible and does not overwrite the damaged record across restarts.

## iOS / Safari (where supported by deployment assumptions)

- [ ] Open in Safari and install/launch standalone where available.
- [ ] Check standalone storage persistence across force-quit and relaunch.
- [ ] Check safe-area insets, keyboard/input behavior, and orientation changes.
- [ ] Check offline launch and locally persisted actions.
- [ ] Check backup file picker/export behavior and recovery choices.

## General responsive and accessibility checks

- [ ] Keyboard focus order and visible focus on controls, notices, sheets, and recovery actions.
- [ ] Screen-reader names/states for dialogs, tabs, controls, and heatmap days.
- [ ] Large text/browser zoom and long habit/class/notification text.
- [ ] Portrait and landscape at small mobile, large mobile, tablet, and desktop widths.
- [ ] Dialog/sheet overflow and keyboard dismissal.
- [ ] Yearly Activity horizontal scrolling remains inside its own viewport; no page-level horizontal overflow.
- [ ] Import/export, update, migration, recovery, and reset paths.
- [ ] Open two tabs from the same profile; verify a sequential stale-tab save is rejected and inspect the documented simultaneous-write limitation.
