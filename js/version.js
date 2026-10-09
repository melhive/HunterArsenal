/* Single source of truth for the app version.
 * Bump APP_VERSION and add a CHANGELOG entry to ship an update.
 * Loaded by index.html AND by sw.js (importScripts), so the cache name always matches. */
(function (g) {
  g.APP_VERSION = '2.6.0';
  g.CHANGELOG = [
    {
      version: '2.6.0',
      date: '2026-10-09',
      sections: [
        { title: 'VISUAL IDENTITY', notes: [
          'Integrated the official HA sword logo across app branding and icons',
          'Refreshed city, quest and life background artwork',
          'Updated offline asset cache for the new branding'
        ] }
      ]
    },
    {
      version: '2.5.0',
      date: '2026-10-08',
      sections: [
        { title: 'YEARLY ACTIVITY', notes: [
          'New GitHub-style yearly activity heatmap',
          'Monthly calendar visualization',
          'Daily activity intensity based on habit completion',
          'Tap a day to view its activity details',
          'Improved mobile yearly activity navigation'
        ] },
        { title: 'HUNTER CREDIT SHOP', notes: [
          'Purchase confirmation is now required before spending Hunter Credits',
          'Confirmation shows item cost',
          'Confirmation shows current HC balance',
          'Confirmation shows remaining HC after purchase',
          'Prevents accidental purchases'
        ] },
        { title: 'VISUAL IDENTITY', notes: [
          'Updated HunterArsenal branding',
          'Human Metamorphosis Program identity'
        ] },
        { title: 'IMPROVEMENTS', notes: [
          'Improved activity detail positioning on mobile',
          'Improved usability of the yearly activity overview'
        ] }
      ]
    },
    {
      version: '2.4.0',
      date: '2026-10-07',
      notes: [
        'Habits, Titles and Hunter Credits terminology with seven-level Habit Mastery',
        'Updated Core XP, Daily Mission risk, Streak Freeze milestones and Rest Days',
        'Seven-section Settings hub, Hunter’s Rules and live Versatility radar',
        'Hunter Credits shop for display modes, photo borders and name plates',
        'Reliable Hunter License rendering with immediate fallback and optional art redraw',
        'Profile photo crop preview, zoom and pan controls',
        'Mobile install manifest, branded icons and refreshed offline cache'
      ]
    },
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
        'Profile and progression interface terminology update',
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
