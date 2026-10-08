# HunterArsenal UI Design System

This document records the current implemented interface. It is descriptive: values below were extracted from `css/styles.css`, `js/gamification.js`, `js/app.js`, `js/systemwindow.js`, and `index.html`. It does not establish a replacement theme or normalize existing differences.

## Product and implementation identity

- HunterArsenal is a local-first, offline-capable PWA.
- The app is built with browser JavaScript, semantic HTML templates, and one stylesheet. It does not use React or another UI framework.
- The shell and content use a mobile-first, fixed-height app frame capped at 480 CSS pixels. On wider screens it remains a centered, phone-width interface.
- The system header uses the HunterArsenal logo asset with a local fallback. The current product identity is HunterArsenal / Human Metamorphosis Program.

## Typography

The stylesheet defines three font stacks. It does not include `@font-face` declarations, so installed or system fallback fonts may be used:

- Display: `IBM Plex Sans Condensed`, `Barlow Condensed`, `Roboto Condensed`, `Arial Narrow`, system UI.
- UI: `IBM Plex Sans`, `Inter`, system UI, `Segoe UI`, Roboto.
- Monospace: `IBM Plex Mono`, `JetBrains Mono`, platform monospace, SF Mono, Consolas.

Display type is commonly bold, uppercase, and letter-spaced for section/system labels. Body text uses the UI stack; identifiers, timestamps, and measurements often use monospace. Font sizes are component-specific and use `rem` values scaled by the root font-size rule.

## Color and theme

The runtime theme is selected from `HA.Game.THEMES` and applied by `applyTheme()` to `--accent`, `--edge`, `--hue`, and `--sat`.

Default theme values:

| Token | Current value | Use |
|---|---|---|
| `--accent` | `#3ab0c2` | Active/system accent |
| `--edge` | `#2d5566` | Panel edge and accent surface |
| `--bg` | `#0b0e12` | App background token |
| `--ink` | `#dfe5ec` | Main text token |
| `--muted` | `#848f9c` | Muted text token |
| `--line` | `rgba(128, 142, 158, .20)` | Subtle dividers |
| `--green` | `#5f9e7e` | Success/complete |
| `--gold` | `#b99a5c` | Hunter Credits and reward emphasis |
| `--orange` | `#b98a50` | Streak-related emphasis |
| `--pink` | `#8f84b8` | Violet secondary accent |
| `--red` | `#b5575f` | Danger/Strength |

Attribute colors are separately represented by `--str` `#b5575f`, `--vit` `#5f9e7e`, `--int` `#4a9bb0`, `--per` `#8b7db3`, and `--cha` `#b99a5c`; the engine also defines the corresponding per-Attribute colors. Theme variants are Standard, Night Ops, Field Green, Amber Terminal, Violet Signal, Redacted Mono, Brass, and Deep Indigo.

The visual treatment uses near-black graphite surfaces, steel text and borders, chamfered panels, restrained accent glows, and Attribute-specific accents. Many component colors remain literal CSS values rather than tokens.

## Surfaces, borders, radius, and shadows

- Main surface colors include `#0b0e12`, `#121418`, `#13161a`, `#14171b`, `#1a1e24`, and `#20252c`.
- Shared panel borders use the current `--edge` theme and chamfered corners. Panel cut sizes are commonly `.23rem`–`.63rem` through the local `--c` property.
- Border radii are component-specific; common implemented values are `.22rem`, `.25rem`, `.3rem`, `.35rem`, `.4rem`, `.45rem`, `.5rem`, and `.6rem`. There is no shared radius token.
- Shadows are generally accent/tone `color-mix()` glows. Their blur and opacity vary by component; there is no global shadow token.

## Spacing and dimensions

- Spacing is based on `rem`, but there is no spacing scale/token set. Component rules commonly use `.2rem`–`.9rem` gaps and padding, with larger margins for sections and dialogs.
- Root font sizing is `calc(16 * min(100vw, 480px) / 433)`, keeping the design proportionate to the 433 px reference width and capped at the 480 px app width.
- The app shell is `max-width: 480px`, fills `100vh`/`100dvh`, clips overflow, and has a vertically scrolling content region above the fixed bottom dock.
- Safe-area variables are `--safe-top` and `--safe-bottom` using `env(safe-area-inset-*, 0px)`.

## Reusable components and interaction patterns

- `panel()` creates the chamfered panel/frame/body structure.
- Buttons are native `<button>` elements in most controls. Selected controls use `aria-selected` or `aria-pressed`; disabled controls use the native `disabled` attribute.
- Cards, tabs, filters, segmented controls, form fields, progress bars, and bottom navigation have component-specific classes in `css/styles.css`.
- Attribute and mastery details use the existing `.chead`, `.tiers`, `.trow2`, and `.bar` patterns.
- Sheets use `openSheet()` and `.backdrop`/`.sheet`. System notices use the queued `HA.Notice` component and `.nw*` styles; transient feedback uses `toast()` and the habit completion reward toast.
- The global `:focus-visible` rule uses a `.12rem` outline in the active accent. Reduced-motion rules shorten or disable animations.

## Icons and imagery

- UI icons are inline SVG paths from the app icon map and use the `.ico` class (`1em` square, current-color stroke).
- The official logo is loaded from `assets/branding/hunterarsenal-logo.png` with SVG fallbacks. Optional art and fonts may be absent; documented fallback artwork is used.
- The Hunter License is drawn to canvas from authoritative view data.

## Responsive and mobile behavior

- The app uses a phone-width shell on desktop and viewport/safe-area sizing on mobile.
- Page-level overflow is clipped by `#app`; the content region scrolls vertically.
- The Yearly Activity calendar has its own horizontally scrolling viewport with contained overscroll. Other horizontal lists, such as filter chips, are individually scrollable.
- The bottom dock remains visible below the content and accounts for the bottom safe area.

## Accessibility baseline

- The app uses native buttons, labels, selects, and inputs; many data controls have accessible labels or state attributes.
- Focus-visible outlines, reduced-motion handling, heatmap day labels, dialog roles, status toasts, and modal notice focus trapping are present.
- The System Notice traps focus and restores the prior focus. Sheets now focus an initial control and keep Tab navigation inside the active dialog.
- Some interactive rows and visual summaries use custom roles or static SVG summaries; see known gaps below.

## Known UI consistency gaps

These are observed differences, not automatic redesign tasks:

1. **Token coverage:** Theme, text, Attribute, and safe-area variables exist, but many surface, border, text, radius, spacing, and shadow values are component-local literals.
2. **Typography scale:** There is no documented font-size/line-height scale; sizes are set per component and include very small metadata labels.
3. **Control states:** Focus styling is global, but hover/pressed/disabled treatments vary by control. Some disabled controls primarily use opacity, while others use a dedicated style.
4. **Modal consistency:** System Notices have a focus trap. Sheets now have keyboard focus handling, but they do not share the Notice queue's presentation or close behavior.
5. **Text sizing:** The root sizing formula scales down below the reference width; browser text zoom and very narrow landscape screens should receive manual device testing.
6. **Empty states:** Main Habit, Skill, History, and Mastery empty states are contextual. Filtered lists have their own copy; wording patterns differ by feature.
7. **Contrast validation:** Colors are explicitly listed, but no automated contrast audit is configured. Contrast should be measured before changing colors.

No inconsistent measurements were normalized as part of this audit.

## Specification status

This section separates approved product requirements from values that merely describe the current implementation. The values above are an inventory, not a mandate to tokenize or normalize them.

### LOCKED / PRODUCT REQUIREMENT

- HunterArsenal identity, official logo usage, current approved color theme, and Human Metamorphosis Program branding.
- Existing approved screen architecture and behavior, including the Home, History/Yearly Activity, Attribute Class Overview, Habit Mastery, Settings, notification, and Hunter Credit Shop experiences.
- Attribute Classes and Habit Mastery remain separate progression systems. Their approved rules and existing data are preserved.
- The Yearly Activity calendar retains its approved weekly grid, weekday/month hierarchy, contained horizontal scrolling, chronological ordering, year selection, and day details.

### IMPLEMENTATION STANDARD

- Keep page-level horizontal overflow contained; intentional horizontal scrolling belongs to its component viewport.
- Preserve keyboard-visible focus, semantic native controls where practical, safe-area support, reduced-motion behavior, and accessible dialog/status semantics when modifying existing interactions.
- Treat user-provided and imported values as untrusted before HTML interpolation or persistence.
- Preserve user data on parsing, validation, migration, and persistence failures; recovery must be explicit before writes resume.

### CURRENT IMPLEMENTATION DETAIL

- The specific font stacks, CSS literal colors, root scaling formula, app width, surface values, panel cuts, radii, shadows, and per-component dimensions documented above describe the checked-in implementation at review time.
- Some colors are runtime theme variables; many details remain component-local. No complete token scale exists.
- The inventory is descriptive: it does not make these exact values universal tokens or imply that component-specific differences are defects.

### INTENTIONALLY FLEXIBLE

- Component-local spacing, typography size, radii, shadows, borders, and dimensions may differ where the existing component design calls for it.
- Optional artwork/font availability and the corresponding fallbacks remain implementation-specific.
- Theme variants can alter runtime accent values while preserving the current product identity.

### KNOWN GAP / FUTURE REVIEW

- Contrast ratios, minimum touch targets, text zoom, landscape layouts, and assistive-technology behavior need browser/device verification before any design rule is changed.
- Interaction states are not perfectly uniform across controls. Address a specific demonstrated usability issue in its own scoped change; do not normalize the UI solely from this inventory.
