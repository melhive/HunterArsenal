/* Single source of truth for the app version.
 * Bump APP_VERSION and add a CHANGELOG entry to ship an update.
 * Loaded by index.html AND by sw.js (importScripts), so the cache name always matches. */
(function (g) {
  g.APP_VERSION = '2.3.0';
  g.CHANGELOG = [
    {
      version: '2.3.0',
      date: '2026-10-07',
      notes: [
        'Daily Mission: set a time once and it arrives every day (or just today)',
        'New Hunter’s License layout with rank-based palettes, ID mark and barcode',
        'Rank titles end in Hunter again; Skills replace Disciplines; Hunter Profile',
        'Cleaner, grouped Settings; Settings removed from Profile and Records',
        'New icons, including a muscle icon for Strength',
        'Smoother transitions across screens, tabs and dialogs',
        'Mission Clock layout fixed; Versatile label only shows when earned'
      ]
    },
    {
      version: '2.2.0',
      date: '2026-10-06',
      notes: [
        'New graphite command-terminal color theme',
        'Operator vocabulary: Protocols, Disciplines, Daily Directives, Designations, Qualifications, Operations and Research Credits',
        'App Lock: passcode with optional fingerprint or face unlock (Settings > Security)',
        'Encrypted backups: AES-256 with your passphrase. Plain backups still available',
        'Segmented progress bars, corner-bracket panels and a classification strip'
      ]
    },
    {
      version: '2.1.0',
      date: '2026-10-04',
      notes: [
        'New Home: level and rank card, attribute chips, Today’s Quest and a full Life Clock',
        'Core Progression: every habit gives +10 Hunter XP, +5 attribute XP and +5 mastery XP',
        'Ranks E to S by level, with no rank multipliers',
        'New class tiers and mastery ladders with progress bars that reset each tier',
        'Starter habits and a guided first-run setup',
        'Up to 8 active habits, one completion per habit per day'
      ]
    },
    {
      version: '2.0.0',
      date: '2026-10-03',
      notes: [
        'New HUD interface across every screen',
        'Habit Arsenal and Skill Arsenal with attribute filters',
        'Attribute bars now fill toward each class tier, then reset for the next one',
        'Versatile label when your top attributes are balanced',
        'Hunter License: a live card with Save as Image and Share',
        'Achievements, Titles, Challenges and Themes under Bonus',
        'Daily Quest scheduling with repeatable cycles'
      ]
    }
  ];
})(typeof self !== 'undefined' ? self : window);
