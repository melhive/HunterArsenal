/* HunterArsenal UI layer.
 * Rendering + events only. All progression math lives in gamification.js (HA.Game),
 * persistence in storage.js (HA.Store), notices in systemwindow.js (HA.Notice). */
(function () {
'use strict';
const HA = window.HA, G = HA.Game, Store = HA.Store, Notice = HA.Notice;
let S = Store.load();

/* ============================== icons ============================== */
const ICONS = {
  laptop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/>',
  dumbbell: '<path d="M3 9.5v5M6 6.5v11M18 6.5v11M21 9.5v5M6 12h12"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  bed: '<path d="M3 20V5"/><path d="M3 16h18v4"/><path d="M21 16v-3a3 3 0 0 0-3-3h-8v6"/><circle cx="6.5" cy="12" r="1.6"/>',
  water: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  run: '<circle cx="15.5" cy="4.5" r="1.9"/><path d="m11 21 2.4-5.4L10 13l1.6-4.6 3.4 1.1 2.3 2.6 3 .6M9.4 8.4 6 9.5M8.2 17.2 6 21"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  guitar: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  people: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.2c.6-.2 1.3-.2 2-.2 2.2 0 4 1.8 4 4"/>',
  code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
  bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  brain: '<path d="M9.5 4A3.5 3.5 0 0 0 6 7.5c0 .5.1 1 .3 1.4A3.5 3.5 0 0 0 5 12a3.5 3.5 0 0 0 1.5 2.9A3.5 3.5 0 0 0 9.5 20H12V4z"/><path d="M14.5 4A3.5 3.5 0 0 1 18 7.5c0 .5-.1 1-.3 1.4A3.5 3.5 0 0 1 19 12a3.5 3.5 0 0 1-1.5 2.9A3.5 3.5 0 0 1 14.5 20H12"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
  apple: '<path d="M12 20.9c1.5 0 2.8 1.1 4 1.1 3 0 6-8 6-12.2A4.9 4.9 0 0 0 17 5c-2.2 0-4 1.4-5 2-1-.6-2.8-2-5-2a4.9 4.9 0 0 0-5 4.8C2 14 5 22 8 22c1.3 0 2.5-1.1 4-1.1Z"/><path d="M10 2c1 .5 2 2 2 5"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  shieldplus: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 9v6M9 12h6"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  fist: '<path d="M12.4 13A5 5 0 0 1 22 15c0 3.9-4 7-9 7-4.1 0-8.2-.8-10.4-2.5-.4-.3-.6-.8-.6-1.4C2.1 12.7 2.6 2 10 2a3 3 0 0 1 3 3 2 2 0 0 1-2 2c-1.1 0-1.6-.4-2-1"/><path d="M15 14a5 5 0 0 0-7.6 2"/><path d="M10 6.8C8 8 9.5 13 8 15"/>',
  muscle: '<path d="M12.4 13A5 5 0 0 1 22 15c0 3.9-4 7-9 7-4.1 0-8.2-.8-10.4-2.5-.4-.3-.6-.8-.6-1.4C2.1 12.7 2.6 2 10 2a3 3 0 0 1 3 3 2 2 0 0 1-2 2c-1.1 0-1.6-.4-2-1"/><path d="M15 14a5 5 0 0 0-7.6 2"/><path d="M10 6.8C8 8 9.5 13 8 15"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3L8 14.2 3 9.3l6.9-1z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  arrowup: '<path d="M12 19V5M5 12l7-7 7 7"/><path d="M8 21h8"/>',
  crown: '<path d="m2 8 5 5 5-8 5 8 5-5-2 12H4z"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  swords: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  hourglass: '<path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  bars: '<path d="M12 20V10M18 20V4M6 20v-4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>',
  chev: '<path d="m9 18 6-6-6-6"/>', chevL: '<path d="m15 18-6-6 6-6"/>', plus: '<path d="M12 5v14M5 12h14"/>', close: '<path d="M18 6 6 18M6 6l12 12"/>',
  pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  dots: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  palette: '<path d="M12 22a10 10 0 1 1 10-10c0 3-2 4-4 4h-2a2 2 0 0 0-1.5 3.3A2 2 0 0 1 12 22z"/><circle cx="7.5" cy="11" r="1"/><circle cx="12" cy="7" r="1"/><circle cx="16.5" cy="11" r="1"/>',
  id: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2.2"/><path d="M13 10h5M13 14h4M5 17c.6-1.5 1.8-2.2 3-2.2s2.4.7 3 2.2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  sort: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  restore: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  scroll: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  lockopen: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>'
};
HA.Icons = ICONS;
const PICK_HABIT = ['laptop', 'dumbbell', 'book', 'bed', 'water', 'run', 'target', 'guitar', 'leaf', 'people', 'code', 'bulb', 'brain', 'smile', 'apple', 'heart', 'shield', 'trophy'];
const PICK_SKILL = ['laptop', 'code', 'shield', 'dumbbell', 'book', 'camera', 'guitar', 'brain', 'bulb', 'target', 'people', 'eye'];
const ICON_COLOR = { water: '#3ab0c2', dumbbell: '#5f9e7e', book: '#b99a5c', bed: '#8f84b8', laptop: '#4b95ae', people: '#8f84b8', run: '#5f9e7e', target: '#8b7db3', guitar: '#4fa59c', leaf: '#5f9e7e', code: '#3ab0c2', bulb: '#b99a5c', brain: '#8f84b8', smile: '#b99a5c', apple: '#d58282', heart: '#b0586c', shield: '#5f9e7e', trophy: '#b99a5c', camera: '#b99a5c', eye: '#8b7db3' };
const colorOf = i => ICON_COLOR[i] || '#3ab0c2';
const ic = (n, c) => `<svg class="ico ${c || ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ICONS.check}</svg>`;
const GRIP = '<svg viewBox="0 0 10 16" aria-hidden="true"><circle cx="2.5" cy="3" r="1.5"/><circle cx="7.5" cy="3" r="1.5"/><circle cx="2.5" cy="8" r="1.5"/><circle cx="7.5" cy="8" r="1.5"/><circle cx="2.5" cy="13" r="1.5"/><circle cx="7.5" cy="13" r="1.5"/></svg>';
const ringSVG = '<svg class="avatar-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="50" cy="50" r="40" fill="none" stroke="#2d5566" stroke-width="1" stroke-dasharray="2 4"/>' +
  [0, 45, 90, 135, 180, 225, 270, 315].map(a => `<path d="M50 0 L53 7 L50 11 L47 7Z" fill="currentColor" transform="rotate(${a} 50 50)"/>`).join('') + '</svg>';

/* ============================== helpers ============================== */
const $ = (s, r) => (r || document).querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.round(n).toLocaleString('en-US');
const pad = n => String(n).padStart(2, '0');
const panel = (cls, inner, attrs, tag, style) =>
  `<${tag || 'div'} class="panel ${cls || ''}" ${attrs || ''} ${style ? `style="${style}"` : ''}><div class="frame"><div class="body">${inner}</div></div></${tag || 'div'}>`;
const ac = a => G.ATTRS[a].color;
const atag = (a, full) => `<span class="atag" style="--ac:${ac(a)}">${ic(G.ATTRS[a].icon)}${a}${full ? `<small>${G.ATTRS[a].name}</small>` : ''}</span>`;
const today = () => G.todayKey();
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'], DOWN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const fmtDate = (k, o) => G.parseKey(k).toLocaleDateString('en-US', o || { month: 'short', day: 'numeric' });
const rankPill = (id, tag) => `<${tag || 'span'} class="pill" data-rank="${id}" ${tag === 'button' ? 'data-act="rank-modal" aria-label="Rank details"' : ''}>${id}-Rank</${tag || 'span'}>`;

/* ============================== UI state ============================== */
let view = 'home', homeTab = 'today', bonusSub = null, profileSub = null, curDay = today();
let habitFilter = 'ALL', skillFilter = 'ALL', achFilter = 'all', achSort = 'default', titleFilter = 'all', titleCat = 'All', titleQuery = '';
let weekOffset = 0, popId = null, menuSkill = null, menuHabit = null, chFilter = 'all', classTab = null, deferredPrompt = null, swReg = null, appVersion = window.APP_VERSION || '', draft = null, dqTimer = null;

const save = () => { if (!Store.save(S)) toast('Storage is full or blocked. Export a backup in Settings.'); };

/* ============================== theme ============================== */
function applyTheme() {
  const th = G.THEMES.find(t => t.id === S.settings.theme) || G.THEMES[0];
  const st = document.documentElement.style;
  st.setProperty('--accent', th.accent); st.setProperty('--edge', th.edge);
  st.setProperty('--hue', (th.hue || 0) + 'deg'); st.setProperty('--sat', th.sat === undefined ? 1 : th.sat);
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = '#0b0e12';
  HA.Sound.enabled = !!S.settings.sound;
}

/* ============================== derived view data ============================== */
function snap() {
  const c = G.context(S, today()), mx = G.masteryXPMap(S), m = {};
  S.habits.forEach(h => { m[h.id] = G.masteryTier(mx[h.id] || 0).idx; });
  return { level: c.level, rankIdx: c.rankIdx, attrIdx: { ...c.attrIdx }, mastery: m };
}
const currentTitle = () => (S.profile.equippedTitle && S.unlocked.titles[S.profile.equippedTitle] ? G.TITLES.find(t => t.id === S.profile.equippedTitle) : null);
function liveCombo() { const r = S.days[today()]; return S.streak.combo + (r && r.perfect ? 1 : 0); }

/* ============================== screens ============================== */
const avatarInner = () => S.profile.avatar ? `<img src="${S.profile.avatar}" alt="">` : esc((S.profile.name || 'H').trim().charAt(0).toUpperCase() || 'H');
const pad3 = n => String(n).padStart(3, '0');
const rankEmblem = (id, color) => `<svg viewBox="0 0 48 54" aria-hidden="true"><polygon points="24,2 45,14 45,40 24,52 3,40 3,14" fill="#14181c" stroke="${color}" stroke-width="2.4"/><polygon points="24,8 39,17 39,37 24,46 9,37 9,17" fill="none" stroke="${color}" stroke-opacity=".5" stroke-width="1.2"/><text x="24" y="35" text-anchor="middle" font-size="22" font-weight="700" fill="${color}" font-family="var(--font-display)">${id}</text></svg>`;

function sysHeader() {
  const alert = S.dailyQuest.state === 'available';
  return `<header class="sys">
    ${panel('sys-brand', `<img class="sys-logo" src="assets/branding/hunterarsenal-logo.png" data-fallback="assets/fallback/logo-mark.svg" alt=""><div><h1>HUNTER<b>ARSENAL</b></h1><p>HUMAN RESEARCH PROGRAM</p><small>PROJECT HA-001 // CLASSIFICATION: PERSONAL</small></div>`)}
    ${panel('sys-info', `<div><span>SYS v${esc(appVersion)}</span><span>NODE: LOCAL</span><span>STORAGE: ON-DEVICE<i></i></span></div>`)}
    ${panel('sys-bell', `${ic('bell')}${alert ? '<span class="dot"></span>' : ''}`, `data-act="bell" aria-label="Daily Mission alerts${alert ? ': a mission is waiting' : ''}"`, 'button')}
  </header>`;
}

function levelCardHTML() {
  const xp = G.totalXP(S), li = G.levelInfo(xp), rp = G.rankProgress(xp), rk = rp.rank, cls = G.classInfo(G.attrXP(S));
  return panel('lvlcard', `<div class="lc-left"><div class="lc-lv">Lv. ${li.level}</div>
      <div class="bar" role="progressbar" aria-label="Progress to next rank" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(rp.pct)}"><i style="width:${rp.pct}%"></i></div>
      <div class="lc-xp">${fmt(xp)} / ${fmt(rp.nextXP)} XP${rp.max ? ' · MAX' : ''}</div></div>
    <div class="lc-rank" style="--rc:${rk.color}"><span class="emb">${rankEmblem(rk.id, rk.color)}</span><div><b>${rk.id}-RANK</b><span class="t">${esc(rk.title)}</span><em class="cls-pill">${esc(cls.name.toUpperCase())}</em></div></div>${ic('chev', 'lc-chev')}`,
    'data-act="rank-modal" aria-label="Level and rank details"', 'button');
}

function attrChipsHTML() {
  const ax = G.attrXP(S);
  return `<div class="achips" role="group" aria-label="Attributes">${G.ATTR_ORDER.map(a => { const t = G.attrTier(a, ax[a]);
    return `<button class="achip" style="--ac:${ac(a)}" data-act="class-modal" data-a="${a}" aria-label="${G.ATTRS[a].name}: ${ax[a]} XP, ${esc(t.name)}">${ic(G.ATTRS[a].icon)}<span class="c">${a}</span><b>${fmt(ax[a])}</b><div class="bar"><i style="width:${t.pct}%"></i></div></button>`; }).join('')}</div>`;
}

const DQ_LABEL = { available: 'PENDING', accepted: 'IN PROGRESS', completed: 'CLEARED', failed: 'FAILED', declined: 'DECLINED', scheduled: 'SCHEDULED', none: 'NOT SET' };
function todayQuestHTML() {
  const dq = S.dailyQuest, st = dq.state, live = st === 'available' || st === 'accepted';
  const when = dq.at ? new Date(dq.at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : '';
  const rep = !!dq.repeat;
  const text = live ? 'Complete today’s scheduled protocols to clear the mission.' : st === 'completed' ? (rep ? 'Mission cleared. The next one arrives automatically.' : 'Mission cleared. Set a time for the next one any time.') : st === 'scheduled' ? `Your next Daily Mission arrives ${when}${rep ? ', every day' : ''}.` : st === 'failed' ? (rep ? 'The last mission was missed. The next one arrives automatically.' : 'The last mission was missed. Set a time for the next one.') : 'Set a time and a Daily Mission arrives every day to earn additional Core XP.';
  const cta = st === 'available' ? ['VIEW MISSION', 'dq-open'] : st === 'accepted' ? ['VIEW MISSION', 'dq-sheet'] : [rep ? 'EDIT TIME' : 'SET TIME', 'dq-sheet'];
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
  return panel('tq', `<div class="tq-head">${ic('target', 'tq-ico')}<div><h2>TODAY’S MISSION</h2><p>COMPLETE ALL YOUR PROTOCOLS TODAY.</p></div><span class="tq-date">${dateStr}</span></div>
    <div class="tq-card"><span class="scroll-ico">${ic('scroll')}</span><div class="tq-main"><div class="tq-title"><b>DAILY MISSION</b><span class="tq-chip ${st}">${DQ_LABEL[st]}</span></div><p>${esc(text)}</p></div></div>
    <div class="tq-foot"><div class="tq-reward"><small>REWARD</small><b>+${G.CONST.DAILY_QUEST_BONUS} Core XP</b></div><button class="tq-btn" data-act="${cta[1]}">${cta[0]}${ic('chev')}</button></div>`);
}

function tabsHTML() {
  const t = (id, icon, label) => `<button role="tab" class="tab" aria-selected="${homeTab === id}" data-act="tab" data-t="${id}">${ic(icon)}<span>${label}</span></button>`;
  return panel('tabs', t('today', 'sun', 'Today') + t('habits', 'dumbbell', 'Protocols') + t('skills', 'book', 'Skills') + t('bonus', 'trophy', 'Records'), 'role="tablist" aria-label="Home sections"');
}

/* ---------- life clock ---------- */
function lifeInfo() {
  const b = S.profile.birthdate; if (!b) return null;
  const birth = G.parseKey(b), end = new Date(birth); end.setFullYear(end.getFullYear() + S.profile.lifespan);
  const now = new Date(), total = Math.round((end - birth) / 864e5);
  if (end <= now) return { y: 0, mo: 0, d: 0, h: 0, mi: 0, s: 0, days: 0, total, pct: 0 };
  let y = end.getFullYear() - now.getFullYear(), mo = end.getMonth() - now.getMonth(), d = end.getDate() - now.getDate(), h = end.getHours() - now.getHours(), mi = end.getMinutes() - now.getMinutes(), sec = end.getSeconds() - now.getSeconds();
  if (sec < 0) { sec += 60; mi--; } if (mi < 0) { mi += 60; h--; } if (h < 0) { h += 24; d--; }
  if (d < 0) { d += new Date(end.getFullYear(), end.getMonth(), 0).getDate(); mo--; } if (mo < 0) { mo += 12; y--; }
  const days = Math.ceil((end - now) / 864e5);
  return { y, mo, d, h, mi, s: sec, days, total, pct: (days / total) * 100 };
}
function lifeCardHTML() {
  const l = lifeInfo();
  const head = `<div class="lf-head">${ic('hourglass')}<div><h2>MISSION CLOCK</h2><p>REMAINING TIME ALLOCATION.</p></div></div>`;
  if (!l) return `<section class="lifecard">${panel('', `${head}<button class="addrow" data-act="nav" data-v="settings" style="margin-top:.6rem">${ic('calendar')}Set your birthdate</button>`)}</section>`;
  const box = (id, label, v) => `<div class="lf-box"><small>${label}</small><b id="lc-${id}">${v}</b></div>`;
  return `<section class="lifecard" aria-label="Mission Clock">${panel('', `${head}<div class="lf-body"><div class="lf-boxes">${box('y', 'YEARS', l.y)}${box('mo', 'MONTHS', l.mo)}${box('d', 'DAYS', l.d)}${box('h', 'HOURS', l.h)}${box('mi', 'MINS', l.mi)}${box('s', 'SECS', l.s)}</div>
    <div class="lf-side"><b id="lc-days">${fmt(l.days)} days</b><span id="lc-pct">${l.pct.toFixed(1)}%</span><div class="bar"><i id="lc-bar" style="width:${l.pct}%"></i></div><div class="lf-scale"><span>0</span><span>${fmt(l.total)}</span></div></div></div>`)}</section>`;
}
function tickLife() {
  const l = lifeInfo(); if (!l || !$('#lc-s')) return;
  [['y', l.y], ['mo', l.mo], ['d', l.d], ['h', l.h], ['mi', l.mi], ['s', l.s]].forEach(([k, v]) => { const e = $('#lc-' + k); if (e && e.textContent !== String(v)) e.textContent = v; });
  const dd = $('#lc-days'); if (dd) dd.textContent = `${fmt(l.days)} days`;
}

const addRow = (kind, label) => `<button class="addrow" data-act="add" data-kind="${kind}">${ic('plus')}${label}</button>`;
const filtersHTML = (cur, act, count, label) => `<div class="filters" role="group" aria-label="Filter by attribute">
  <button class="fchip all" aria-pressed="${cur === 'ALL'}" data-act="${act}" data-v="ALL">${ic('list')}${label} (${count})</button>
  ${G.ATTR_ORDER.map(a => `<button class="fchip" style="--fc:${ac(a)}" aria-pressed="${cur === a}" data-act="${act}" data-v="${a}">${ic(G.ATTRS[a].icon)}${a}</button>`).join('')}</div>`;

function habitMenuHTML(h) {
  return `<div class="menu" role="menu"><button role="menuitem" data-act="edit" data-kind="habit" data-id="${h.id}">${ic('pencil')}Edit</button><button role="menuitem" data-act="archive-habit" data-id="${h.id}">${ic('archive')}Archive</button><button role="menuitem" data-act="del-habit" data-id="${h.id}">${ic('trash')}Delete</button></div>`;
}
function todayRow(h, i) {
  const t = today(), done = !!(S.completions[t] && S.completions[t][h.id]);
  const mx = G.masteryXPMap(S)[h.id] || 0, mt = G.masteryTier(mx);
  return `<div class="rowwrap">${panel(`hrow ${done ? 'done' : ''} ${popId === h.id ? 'pop' : ''}`,
    `<button class="hcheck" data-act="toggle" data-id="${h.id}" role="checkbox" aria-checked="${done}" aria-label="${esc(h.name)}">${ic('check')}</button>
     <span class="hnum" aria-hidden="true">${pad(i + 1)}</span>
     <span class="hico" style="--ac:${ac(h.attr)}">${ic(G.ATTRS[h.attr].icon)}</span>
     <div class="hname"><b>${esc(h.name)}</b>${atag(h.attr)}</div>
     <button class="hmast" data-m="${mt.idx}" data-act="mastery-open" data-id="${h.id}" aria-label="Mastery ${mt.name}, ${mx} XP"><div class="hm1"><span>Lv. ${mt.no}</span><em>${mt.name}</em></div><div class="bar"><i style="width:${mt.pct}%"></i></div><div class="hm2">${mt.max ? `${fmt(mx)} XP · MAX` : `${fmt(mx)} / ${fmt(mt.next)} XP`}</div></button>
     <button class="kebab" data-act="habit-menu" data-id="${h.id}" aria-label="Options for ${esc(h.name)}" aria-expanded="${menuHabit === h.id}">${ic('dots')}</button>`)}${menuHabit === h.id ? habitMenuHTML(h) : ''}</div>`;
}
function habitRow(h) {
  return panel('qrow plain left-cut', `<button class="grip" data-grip aria-label="Reorder ${esc(h.name)}">${GRIP}</button>
    <div class="qicon" style="--qc:${colorOf(h.icon)}">${ic(h.icon)}</div>
    <div class="qtext"><b>${esc(h.name)}</b><span>${esc(h.desc || (h.days ? h.days.map(d => DOW[d]).join(' ') : 'Every day'))}</span></div>
    ${atag(h.attr, true)}<div class="xpchip">+${G.CONST.HUNTER_XP} XP</div>
    <button class="edit" data-act="edit" data-kind="habit" data-id="${h.id}" aria-label="Edit ${esc(h.name)}">${ic('pencil')}</button>
    <button class="trash" data-act="del-habit" data-id="${h.id}" aria-label="Delete ${esc(h.name)}">${ic('trash')}</button>`,
    `data-row data-kind="habit" data-id="${h.id}"`);
}
function skillRow(s) {
  const xp = G.skillXP(S, s.id), t = G.masteryTier(xp);
  return panel('qrow plain left-cut srow', `<button class="grip" data-grip aria-label="Reorder ${esc(s.name)}">${GRIP}</button>
    <div class="qicon" style="--qc:${colorOf(s.icon)}">${ic(s.icon)}</div>
    <div class="qtext"><b>${esc(s.name)}</b><span>${esc(s.desc || 'No description')}</span></div>${atag(s.attr)}
    <div class="lv" style="--ac:${ac(s.attr)};--rc:${ac(s.attr)}"><b>Lv. ${t.idx + 1}</b><em>${t.name}</em><div>${t.max ? `${fmt(xp)} XP · MAX` : `${fmt(xp)} / ${fmt(t.next)} XP`}</div><div class="bar"><i style="width:${t.pct}%"></i></div></div>
    <button class="kebab" data-act="skill-menu" data-id="${s.id}" aria-label="Skill options for ${esc(s.name)}" aria-expanded="${menuSkill === s.id}">${ic('dots')}</button>`,
    '');
}
function skillMenuHTML(s) {
  return `<div class="menu" role="menu"><button role="menuitem" data-act="practice" data-id="${s.id}">${ic('bolt')}Log practice (+${G.CONST.PRACTICE_XP} XP)</button><button role="menuitem" data-act="edit" data-kind="skill" data-id="${s.id}">${ic('pencil')}Edit</button><button role="menuitem" data-act="del-skill" data-id="${s.id}">${ic('trash')}Delete</button></div>`;
}

function todayHabitsHTML() {
  const t = today(), list = G.scheduledHabits(S, t), done = list.filter(h => S.completions[t] && S.completions[t][h.id]).length;
  const head = `<div class="hc-head">${ic('calendar')}<h2>TODAY’S PROTOCOLS</h2><span class="hc-chips"><span class="mini continuity" aria-label="Continuity ${liveCombo()}">${ic('flame')}${liveCombo()}</span><span class="mini shield" aria-label="Contingencies ${S.streak.freezes}">${ic('shield')}${S.streak.freezes}</span></span><span class="hc-count"><b>${done}</b> / ${list.length} <small>COMPLETED</small></span></div>`;
  const empty = !S.habits.some(h => !h.archived) ? `<div class="empty"><b>No missions yet</b>Your missions come from your protocols. Add your first protocol to begin.</div>` : (list.length ? '' : '<div class="empty"><b>Rest day</b>No protocols are scheduled for today.</div>');
  return `<section class="hcard">${panel('', `${head}<div class="hlist">${list.map(todayRow).join('')}${empty}</div>${addRow('habit', S.habits.some(h => !h.archived) ? 'Add protocol' : 'Add your first protocol')}`)}</section>`;
}
function tabBody() {
  if (homeTab === 'today') return todayHabitsHTML();
  if (homeTab === 'habits') {
    const all = G.activeHabits(S), list = all.filter(h => habitFilter === 'ALL' || h.attr === habitFilter);
    return `<section class="arsenal">${panel('', `<div class="ttl"><div><h2>Protocol Registry</h2><p>Build, manage and customize your protocols. ${all.length} / ${G.CONST.MAX_ACTIVE_HABITS} active.</p></div></div>${panel('addbtn', `${ic('plus')}Add Protocol`, 'data-act="add" data-kind="habit"', 'button')}`)}</section>
      ${filtersHTML(habitFilter, 'filter-habit', all.length, 'All Protocols')}
      <div class="list" data-list="habit">${list.map(habitRow).join('') || `<div class="empty"><b>${all.length ? 'No protocols here' : 'No protocols yet'}</b>${all.length ? 'No protocol uses this attribute yet.' : 'Tap Add Protocol to create your first routine.'}</div>`}</div>`;
  }
  if (homeTab === 'skills') {
    const list = S.skills.filter(s => skillFilter === 'ALL' || s.attr === skillFilter);
    return `<section class="arsenal">${panel('', `<div class="ttl">${ic('book')}<div><h2>Skill Registry</h2><p>Learn, improve, master your skills.</p></div></div>${panel('addbtn', `${ic('plus')}Add Skill`, 'data-act="add" data-kind="skill"', 'button')}`)}</section>
      ${filtersHTML(skillFilter, 'filter-skill', S.skills.length, 'All Skills')}
      <div class="list" data-list="skill">${list.map(s => `<div class="rowwrap" data-row data-kind="skill" data-id="${s.id}">${skillRow(s)}${menuSkill === s.id ? skillMenuHTML(s) : ''}</div>`).join('') || `<div class="empty"><b>${S.skills.length ? 'No skills here' : 'No skills yet'}</b>${S.skills.length ? 'No skill uses this attribute yet.' : 'Add a skill, then log practice sessions to level it up.'}</div>`}</div>`;
  }
  return bonusHTML();
}

/* ---------- bonus hub ---------- */
const hcChip = () => `<button class="hc" data-act="hc-info" aria-label="Research Credits ${G.hcBalance(S).balance}"><i>RC</i><div><small>Research Credits</small><b>${fmt(G.hcBalance(S).balance)}</b></div></button>`;
const subHead = (icon, title, sub, right) => `<section class="subhead">${panel('', `<button class="backbtn" data-act="bonus-back" aria-label="Back to Records">${ic('chevL')}</button><div class="ttl"><h2>${title}</h2><p>${sub}</p></div>${right || ''}`)}</section>`;
function bonusHTML() {
  if (bonusSub === 'achievements') return achievementsHTML();
  if (bonusSub === 'titles') return titlesHTML();
  if (bonusSub === 'challenges') return challengesHTML();
  if (bonusSub === 'themes') return themesHTML();
  const ua = Object.keys(S.unlocked.achievements).length, ut = Object.keys(S.unlocked.titles).length, uc = Object.keys(S.unlocked.challenges).length;
  const row = (id, icon, tone, name, desc, stat) => panel('hubrow tone', `<div class="qicon">${ic(icon)}</div><div><b>${name}</b><span class="d">${desc}</span></div><div class="stat">${stat || ''}</div>${ic('chev')}`, `data-act="bonus-open" data-v="${id}" aria-label="${name}"`, 'button', `--tone:${tone}`);
  const bar = (n, m) => `<div class="bar"><i style="width:${m ? (n / m) * 100 : 0}%"></i></div>`;
  return `<div class="hub">
      ${row('license', 'id', '#3ab0c2', 'Hunter’s License', 'View your official Hunter’s License.', '')}
      ${row('titles', 'crown', '#c0a263', 'Designations', 'View and assign your designations.', `<strong>${ut}</strong> / ${G.TITLES.length}<br>Unlocked${bar(ut, G.TITLES.length)}`)}
      ${row('achievements', 'trophy', '#b99a5c', 'Qualifications', 'Complete milestones to earn Research Credits.', `<strong>${ua}</strong> / ${G.ACHIEVEMENTS.length}<br>Unlocked${bar(ua, G.ACHIEVEMENTS.length)}`)}
      ${row('challenges', 'swords', '#b5575f', 'Operations', 'Complete operations for Research Credits.', `<strong>${uc}</strong> / ${G.CHALLENGES.length}<br>Completed${bar(uc, G.CHALLENGES.length)}`)}
      ${row('dailyquest', 'scroll', '#8f84b8', 'Daily Missions', 'Schedule and track your Daily Missions.', `<strong>${S.dailyQuest.completed || 0}</strong><br>Cleared`)}
      ${row('credits', 'palette', '#b99a5c', 'Research Credits', 'Research Credits and display modes.', `<strong>${fmt(G.hcBalance(S).balance)}</strong> RC`)}
    </div>`;
}
function progressCell(def, ctx, unlockedAt) {
  if (unlockedAt) return `<div class="prog done">${ic('check')} Unlocked<small>${fmtDate(G.keyOf(new Date(unlockedAt)), { month: 'short', day: 'numeric', year: 'numeric' })}</small></div>`;
  const p = Math.min(def.target, Math.floor(def.progress(ctx)));
  return `<div class="prog">${fmt(p)} / ${fmt(def.target)}<div class="bar"><i style="width:${(p / def.target) * 100}%"></i></div></div>`;
}
function achievementsHTML() {
  const ctx = G.context(S, today());
  let list = G.ACHIEVEMENTS.map(a => ({ a, at: S.unlocked.achievements[a.id] }));
  if (achFilter === 'unlocked') list = list.filter(x => x.at); else if (achFilter === 'locked') list = list.filter(x => !x.at && !x.a.hidden); else if (achFilter === 'hidden') list = list.filter(x => !x.at && x.a.hidden);
  if (achSort === 'newest') list.sort((x, y) => (y.at || 0) - (x.at || 0)); else if (achSort === 'reward') list.sort((x, y) => y.a.reward - x.a.reward);
  const f = (id, label, icon) => `<button class="fchip" aria-pressed="${achFilter === id}" data-act="ach-filter" data-v="${id}">${icon ? ic(icon) : ''}${label}</button>`;
  return subHead('trophy', 'Qualifications', 'Track your milestones and earn rewards.', hcChip()) +
    `<div class="toolbar"><div class="filters" style="padding:0;flex:1">${f('all', 'All', 'grid')}${f('unlocked', 'Unlocked', 'check')}${f('locked', 'Locked', 'lock')}${f('hidden', '??? Hidden')}</div>
      <label class="sr" for="ach-sort">Sort</label><select id="ach-sort" class="select" data-change="ach-sort"><option value="default" ${achSort === 'default' ? 'selected' : ''}>Default</option><option value="newest" ${achSort === 'newest' ? 'selected' : ''}>Newest</option><option value="reward" ${achSort === 'reward' ? 'selected' : ''}>Reward</option></select></div>
    <div class="list">${list.map(({ a, at }) => {
      const hid = a.hidden && !at;
      return panel(`arow tone ${at ? '' : 'locked'} ${hid ? 'hidden-a' : ''}`, `<div class="bdg">${hid ? '?' : ic(a.icon)}</div><div><b>${hid ? 'Hidden Qualification' : a.name}</b><span class="d">${hid ? 'Keep going to discover this qualification.' : a.desc}</span></div>${hid ? '<div class="prog">???</div>' : progressCell(a, ctx, at)}<div class="reward ${at ? 'got' : ''}">${at ? ic('check') : ic('lock')}${hid ? '??? RC' : `+${a.reward} RC`}</div>`, '', 'div', `--tone:${a.tone}`);
    }).join('') || '<div class="empty"><b>Nothing here</b>No qualifications match this filter.</div>'}</div>`;
}
function challengesHTML() {
  const ctx = G.context(S, today());
  let list = G.CHALLENGES.map(c => ({ c, at: S.unlocked.challenges[c.id] }));
  if (chFilter === 'active') list = list.filter(x => !x.at); else if (chFilter === 'completed') list = list.filter(x => x.at);
  const f = (id, label) => `<button class="fchip" aria-pressed="${chFilter === id}" data-act="chal-filter" data-v="${id}">${label}</button>`;
  return subHead('swords', 'Operations', 'Simple goals with real rewards.', hcChip()) + `<div class="filters">${f('all', 'All')}${f('active', 'Active')}${f('completed', 'Completed')}</div>
    <div class="list">${list.map(({ c, at }) => panel(`arow tone ${at ? '' : 'locked'}`, `<div class="bdg">${ic(c.icon)}</div><div><b>${c.name}</b><span class="d">${c.desc}</span></div>${progressCell(c, ctx, at).replace('Unlocked', 'Completed')}<div class="reward ${at ? 'got' : ''}">${at ? ic('check') : ic('lock')}+${c.reward} RC</div>`, '', 'div', `--tone:${c.tone}`)).join('') || '<div class="empty"><b>Nothing here</b>No challenges match this filter.</div>'}</div>`;
}
function titlesHTML() {
  const ctx = G.context(S, today()), eq = currentTitle();
  let list = G.TITLES.map(t => ({ t, at: S.unlocked.titles[t.id] }));
  if (titleCat !== 'All') list = list.filter(x => x.t.cat === titleCat);
  if (titleFilter === 'unlocked') list = list.filter(x => x.at); else if (titleFilter === 'locked') list = list.filter(x => !x.at); else if (titleFilter === 'equipped') list = list.filter(x => eq && x.t.id === eq.id);
  const q = titleQuery.trim().toLowerCase(); if (q) list = list.filter(x => (x.t.name + ' ' + x.t.desc + ' ' + x.t.cat).toLowerCase().includes(q));
  const f = (id, label) => `<button class="fchip" aria-pressed="${titleFilter === id}" data-act="title-filter" data-v="${id}">${label}</button>`;
  return subHead('crown', 'Designations', 'Assign a designation to your hunter profile.') +
    `<section class="tcard-main">${panel('', `<div class="bdg">${ic(eq ? eq.icon : 'lock')}</div><div><small>Assigned designation</small><h3>${eq ? esc(eq.name) : 'None'}</h3><p>${eq ? esc(eq.desc) : 'Unlock a designation, then assign it here.'}<br>${Object.keys(S.unlocked.titles).length} / ${G.TITLES.length} unlocked</p></div>`, '', 'div')}</section>
    <div class="toolbar"><label class="sr" for="t-search">Search designations</label><input id="t-search" class="search" type="search" placeholder="Search designations…" value="${esc(titleQuery)}" data-input="title-search" autocomplete="off">
      <label class="sr" for="t-cat">Category</label><select id="t-cat" class="select" data-change="title-cat"><option>All</option>${G.TITLE_CATS.map(c => `<option ${titleCat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    <div class="filters">${f('all', 'All')}${f('unlocked', 'Unlocked')}${f('locked', 'Locked')}${f('equipped', 'Assigned')}</div>
    <div class="list" id="title-list">${titleRows(list, ctx, eq)}</div>`;
}
function titleRows(list, ctx, eq) {
  return list.map(({ t, at }) => {
    const isEq = eq && eq.id === t.id, p = Math.min(t.target, Math.floor(t.progress(ctx)));
    return panel(`arow tone ${at ? '' : 'locked'}`, `<div class="bdg">${ic(at ? t.icon : 'lock')}</div><div><b>${esc(t.name)}</b><span class="d">${esc(t.cat)} · ${esc(t.desc)}</span></div>
      ${at ? `<div class="prog done">${ic('check')} Unlocked</div>` : `<div class="prog">${fmt(p)} / ${fmt(t.target)}<div class="bar"><i style="width:${(p / t.target) * 100}%"></i></div></div>`}
      <div class="trow-state ${isEq ? 'eq' : at ? 'un' : 'lk'}">${isEq ? 'Assigned' : at ? 'Assign' : 'Locked'}</div>`, `data-act="title-open" data-id="${t.id}" aria-label="${esc(t.name)}, ${isEq ? 'equipped' : at ? 'unlocked' : 'locked'}"`, 'button', `--tone:${at ? '#b99a5c' : '#4a5560'}`);
  }).join('') || '<div class="empty"><b>No designations found</b>Try a different filter or search.</div>';
}
function themesHTML() {
  const ctx = G.context(S, today()), hc = G.hcBalance(S);
  const info = panel('arsenal-info', `<div class="kv"><div><span>Balance</span><b style="color:var(--gold)">${fmt(hc.balance)} RC</b></div><div><span>Earned</span><b>${fmt(hc.earned)} RC</b></div><div><span>Spent</span><b>${fmt(hc.spent)} RC</b></div></div><p class="note" style="text-align:left;padding:.5rem 0 0">RC is cosmetic only. Earn it from qualifications and operations, spend it on display modes. It never buys XP, levels or attributes.</p>`, 'style="margin:.5rem .5rem 0"');
  return subHead('palette', 'Research Credits', 'Research Credits and display modes.', hcChip()) + info +
    `<div class="list">${G.THEMES.map(th => { const st = G.themeStatus(S, th, ctx), eq = S.settings.theme === th.id; let btn;
      if (eq) btn = `<div class="themebtn eq" aria-label="Equipped">${ic('check')}Assigned</div>`;
      else if (st.owned) btn = `<div class="themebtn">Assign</div>`;
      else if (st.buy) btn = `<div class="themebtn">${ic('lock')}<small>${st.cost} RC</small></div>`;
      else btn = `<div class="themebtn lk">${ic('lock')} ${esc(st.label || 'Locked')}</div>`;
      return panel('themerow plain', `<div class="swatch" style="--t1:${th.accent};--t2:${th.edge}"></div><div><b>${th.name}</b><span class="d">${th.desc}</span></div>${btn}`, `data-act="theme-open" data-id="${th.id}" aria-label="${th.name} theme"`, 'button'); }).join('')}</div>`;
}

const SESSION_ID = Array.from(crypto.getRandomValues(new Uint8Array(2)), b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
const zulu = () => new Date().toISOString().slice(11, 19) + 'Z';
function homeHTML() {
  return `<div class="classbar"><span>RESTRICTED // PERSONAL</span><span>SID <b>${SESSION_ID}</b> · <b id="cb-clock">${zulu()}</b></span></div>` + sysHeader() + levelCardHTML() + attrChipsHTML() + todayQuestHTML() + tabsHTML() + `<div class="tabbody">${tabBody()}</div>` + lifeCardHTML() + '<div style="height:.8rem"></div>';
}

/* ---------- history ---------- */
function weekStart(off) { const d = G.parseKey(today()); d.setDate(d.getDate() - d.getDay() + off * 7); return G.keyOf(d); }
function historyHTML() {
  const ws = weekStart(weekOffset), days = Array.from({ length: 7 }, (_, i) => G.addDays(ws, i)), t = today();
  const label = weekOffset === 0 ? 'This week' : weekOffset === -1 ? 'Last week' : 'Week of';
  const hasC = h => days.some(d => S.completions[d] && S.completions[d][h.id]);
  const habits = S.habits.filter(h => (!h.archived && h.created <= days[6]) || hasC(h));
  const header = `<div></div>${days.map(d => `<div class="h ${d === t ? 'today' : ''}"><button data-act="day-open" data-d="${d}" aria-label="Open ${fmtDate(d, { weekday: 'long', month: 'long', day: 'numeric' })}">${DOW[G.parseKey(d).getDay()]}<br>${G.parseKey(d).getDate()}</button></div>`).join('')}`;
  const rows = habits.map(h => `<div class="hn" style="--ac:${colorOf(h.icon)}">${ic(h.icon)}<span>${esc(h.name)}</span></div>${days.map(d => {
    const done = S.completions[d] && S.completions[d][h.id], sch = G.habitScheduledOn(h, d) || done;
    return `<div class="dot ${done ? 'on' : ''} ${!sch ? 'na' : ''} ${d > t ? 'fut' : ''}" role="img" aria-label="${esc(h.name)} ${d}: ${done ? 'done' : sch ? 'not done' : 'not scheduled'}">${done ? ic('check') : ''}</div>`; }).join('')}`).join('');
  // yearly heat map (last 26 weeks)
  const start = G.addDays(weekStart(0), -25 * 7), cells = [];
  for (let i = 0; i < 26 * 7; i++) {
    const d = G.addDays(start, i), r = S.days[d], n = S.completions[d] ? Object.keys(S.completions[d]).length : 0;
    let l = 0; if (n) l = r && r.perfect ? 3 : (r && r.sched && n / r.sched >= .5) ? 2 : 1; if (d > t) l = 0;
    cells.push(`<i data-l="${l}" designation="${d}: ${n} done"></i>`);
  }
  return `<div class="page"><div class="pagebg"></div><h1>History</h1><p class="sub">Review previous days and weeks</p>
    <div class="hist-nav"><button data-act="week" data-v="-1" aria-label="Previous week">← Prev</button><b>${label} (${fmtDate(days[0])} – ${fmtDate(days[6])})</b><button data-act="week" data-v="1" ${weekOffset >= 0 ? 'disabled' : ''} aria-label="Next week">Next →</button></div>
    ${panel('card', habits.length ? `<div class="wk">${header}${rows}</div>` : '<div class="empty"><b>No protocols yet</b>Your weekly grid appears here once you add protocols.</div>')}
    ${panel('card', `<h3>Yearly Overview</h3><div class="heat" role="img" aria-label="Activity over the last 26 weeks">${cells.join('')}</div><div class="legend">Less <i style="background:#22282f"></i><i style="background:#323c48"></i><i style="background:#495869"></i><i style="background:var(--accent)"></i> More</div>`)}</div>`;
}

/* ---------- stats ---------- */
function statsHTML() {
  const t = today(), c = G.context(S, t), mx = G.masteryXPMap(S);
  const last = Array.from({ length: 30 }, (_, i) => G.addDays(t, i - 29));
  const pts = last.map(d => { const r = S.days[d], n = S.completions[d] ? Object.keys(S.completions[d]).length : 0, sch = r && r.sched ? r.sched : G.scheduledHabits(S, d).length; return { d, pct: sch ? Math.min(100, (n / sch) * 100) : 0, n }; });
  const bw = 270 / 30, bars = pts.map((p, i) => `<rect x="${10 + i * bw}" y="${70 - p.pct * .6}" width="${bw - 3}" height="${Math.max(p.n ? 3 : 1.5, p.pct * .6)}" rx="2" fill="${p.n ? 'var(--accent)' : '#272d35'}"/>`).join('');
  const labels = [0, 6, 12, 18, 24, 29].map(i => `<text x="${10 + i * bw}" y="88">${fmtDate(last[i], { month: 'numeric', day: 'numeric' })}</text>`).join('');
  const stat = (v, l) => panel('', `<div class="stat"><b>${v}</b><span>${l}</span></div>`);
  const habits = S.habits.filter(h => !h.archived);
  return `<div class="page"><div class="pagebg"></div><h1>Statistics</h1><p class="sub">Your performance over time</p>
    <div class="grid2">${stat(fmt(c.completions), 'Total check-ins')}${stat(fmt(c.xp), 'XP earned')}${stat(c.bestCombo, 'Best active continuity')}${stat(c.activeDays, 'Active days')}</div>
    ${panel('card', `<h3>Last 30 days — daily completion</h3><svg class="chart" viewBox="0 0 290 94" role="img" aria-label="Daily completion over the last 30 days"><line x1="10" y1="10" x2="280" y2="10" stroke="#303843"/><line x1="10" y1="40" x2="280" y2="40" stroke="#303843"/><line x1="10" y1="70" x2="280" y2="70" stroke="#3b4755"/>${bars}${labels}</svg>`)}
    ${panel('card', `<h3>Protocol mastery</h3>${habits.map(h => { const m = G.masteryTier(mx[h.id] || 0); return `<div class="mrow"><div class="qicon" style="--qc:${colorOf(h.icon)}">${ic(h.icon)}</div><b>${esc(h.name)}</b><span class="recruit-t" style="font:700 .7rem var(--font-ui);color:var(--accent);letter-spacing:.06em">${m.name}</span><div class="bar"><i style="width:${m.pct}%"></i></div></div>`; }).join('') || '<div class="empty"><b>No protocols yet</b>Mastery appears once you add a protocol.</div>'}`)}</div>`;
}

/* ---------- profile ---------- */
function profileHTML() {
  if (profileSub === 'license') return licenseHTML();
  const t = today(), c = G.context(S, t), li = G.levelInfo(c.xp), rk = G.rankForLevel(li.level), cls = G.classInfo(c.attrXp), title = currentTitle();
  const attrs = G.ATTR_ORDER.map(a => { const x = c.attrXp[a], tp = G.attrTier(a, x);
    return `<div class="attr" style="--ac:${ac(a)}"><div class="qicon" style="--qc:${ac(a)}">${ic(G.ATTRS[a].icon)}</div>
      <div class="l1"><b>${G.ATTRS[a].name}</b><span>${tp.max ? `${fmt(x)} XP · MAX` : `${fmt(x)} / ${fmt(tp.next)} XP`}</span></div>
      <div class="bar" role="progressbar" aria-label="${G.ATTRS[a].name} progress" aria-valuenow="${Math.round(tp.pct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${tp.pct}%"></i></div>
      <div class="l3"><em>${tp.name}</em><span>${tp.max ? 'Highest tier reached' : `Next: ${tp.nextName}`}</span></div></div>`; }).join('');
  return `<div class="page"><div class="pagebg"></div><h1>Hunter Profile</h1><p class="sub">Your stats, rank, and designations</p>
    <section class="profile-head">${panel('', `<button class="big-avatar" data-act="avatar" aria-label="Change photo">${ringSVG}<span class="avatar">${avatarInner()}</span><span class="cam">${ic('camera')}</span></button>
      <div><h2>${esc(S.profile.name)} ${rankPill(rk.id, 'button')}</h2><p class="sub2">Level ${li.level} Hunter</p><p class="hid"><span>HUNTER ID</span><b>${esc(S.profile.hunterId)}</b></p><div class="pills" style="flex-wrap:wrap;gap:.35rem"><button class="pill cls" data-act="class-modal">${esc(cls.name)}</button>${cls.versatile ? '<span class="pill vers">Versatile</span>' : ''}</div>${title ? `<p class="ttl" style="margin:.4rem 0 0">“${esc(title.name)}”</p>` : ''}</div>`)}</section>
    ${panel('license-btn', `<span class="qicon">${ic('id')}</span><span><b>Hunter’s License</b><small>View your official Hunter’s License</small></span>${ic('chev', 'chev')}`, 'data-act="license-open" aria-label="Open Hunter’s License"', 'button')}
    ${panel('card', `<h3>Attributes</h3>${attrs}${cls.versatile ? `<div class="vers-note"><b>VERSATILE</b> Your top attributes (${cls.sorted[0].a} and ${cls.sorted[1].a}) are closely matched, like a Universal hero. This is a label only. It does not change XP or class.</div>` : ''}`)}
    <div class="linkrows">${[['user', 'Edit Profile', 'Name, photo and Mission Clock', 'nav', 'settings'], ['archive', 'Backup / Sync', 'Export, import and reset', 'nav', 'settings'], ['info', `About HunterArsenal v${esc(appVersion)}`, 'What’s new', 'whatsnew', '']].map(([i, t, sub, act, v]) => panel('linkrow', `${ic(i)}<span><b>${t}</b><small>${sub}</small></span>${ic('chev', 'chev')}`, `data-act="${act}" ${v ? `data-v="${v}"` : ''}`, 'button')).join('')}</div>
  </div>`;
}
function licenseHTML() {
  return `<div class="page"><div class="pagebg"></div>${`<button class="backbtn" data-act="license-close" aria-label="Back to profile" style="margin-bottom:.6rem">${ic('chevL')}</button>`}<h1>Hunter’s License</h1><p class="sub">Live data from your HunterArsenal progress</p>
    <canvas id="card-canvas" class="cardview" role="img" aria-label="Your Hunter’s License card"></canvas>
    <div style="display:grid;gap:.5rem;margin-top:.8rem"><button class="btn" data-act="card-save">${ic('download')}Save as Image</button><button class="btn ghost" data-act="card-share">${ic('share')}Share License</button></div>
    <p class="note" style="margin-top:.6rem">An in-app collectible. It is not an official identification document.</p></div>`;
}

/* ---------- settings ---------- */
function settingsHTML() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone, ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const ctx = G.context(S, today()), themes = G.THEMES.filter(t => G.themeStatus(S, t, ctx).owned);
  const arch = S.habits.filter(h => h.archived);
  const sec = (label, body, cls) => `<h2 class="setlabel">${label}</h2>${panel('card setcard ' + (cls || ''), body)}`;
  const item = (icon, title, sub, act, cls) => `<button class="setitem ${cls || ''}" data-act="${act}">${ic(icon)}<span><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span>${ic('chev', 'chev')}</button>`;
  const install = standalone ? `<div class="setrow"><div><b>Installed</b><small>Running as an app on this device</small></div><span class="chipstat completed">OK</span></div>`
    : deferredPrompt ? item('download', 'Install app', 'Add HunterArsenal to your home screen', 'install')
    : `<div class="setrow"><div><b>Install app</b><small>${ios ? 'Tap Share, then Add to Home Screen' : 'Browser menu, then Install app / Add to Home screen'}</small></div></div>`;
  return `<div class="page"><div class="pagebg"></div><h1>Settings</h1><p class="sub">Configure your arsenal</p>
    ${sec('Hunter', `<div class="setrow"><div style="display:flex;align-items:center;gap:.6rem"><div class="avatar" style="position:relative;inset:auto;width:2.6rem;height:2.6rem">${avatarInner()}</div><div><b>Photo</b><small>Stored on this device only</small></div></div><div style="display:flex;gap:.4rem"><button class="btn ghost sm" data-act="avatar">Change</button>${S.profile.avatar ? '<button class="btn ghost sm" style="color:#c58790" data-act="avatar-remove">Remove</button>' : ''}</div></div>
      <div class="setrow"><div><b><label for="f-name">Name</label></b><small>Shown on your Dashboard and License</small></div><div class="inline"><input id="f-name" class="input" maxlength="24" value="${esc(S.profile.name)}" autocomplete="off"><button class="btn sm" data-act="save-name">Save</button></div></div>
      <div class="setrow"><div><b>Hunter ID</b><small>Issued ${esc(S.profile.createdAt ? G.keyOf(new Date(S.profile.createdAt)) : '')}</small></div><span class="idtag">${esc(S.profile.hunterId)}</span></div>`)}
    ${sec('Daily Mission', dqFormHTML('settings'))}
    ${sec('Display & Sound', `<div class="setrow"><div><b><label for="f-theme">Display Mode</label></b><small>Unlock more under Records</small></div><select id="f-theme" class="select" data-change="theme">${themes.map(t => `<option value="${t.id}" ${S.settings.theme === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select></div>
      <div class="setrow"><div><b>Sound effects</b><small>Cues for check-ins, level increases and awards</small></div><div class="seg" role="group" aria-label="Sound effects"><button aria-pressed="${!S.settings.sound}" data-act="sound" data-v="0">Off</button><button aria-pressed="${S.settings.sound}" data-act="sound" data-v="1">On</button></div></div>`)}
    ${sec('Gameplay', `<div class="setrow"><div><b>Missed-protocol deviation</b><small>Lose ${G.CONST.PENALTY_PER_MISS} XP per missed protocol (max ${G.CONST.PENALTY_DAY_CAP}/day). A contingency excuses it.</small></div><div class="seg" role="group" aria-label="Deviations"><button aria-pressed="${!S.settings.penalties}" data-act="penalty" data-v="0">Off</button><button aria-pressed="${S.settings.penalties}" data-act="penalty" data-v="1">On</button></div></div>`)}
    ${sec('Mission Clock', `<div class="setrow"><div><b><label for="f-bd">Birthdate</label></b><small>Used only for your Mission Clock</small></div><input id="f-bd" type="date" class="input" value="${esc(S.profile.birthdate)}"></div>
      <div class="setrow"><div><b><label for="f-ls">Estimated lifespan</label></b><small>In years, a rough personal estimate</small></div><input id="f-ls" type="number" min="30" max="120" class="input num" value="${S.profile.lifespan}"></div>
      <div class="setbtns"><button class="btn" data-act="save-life">Save</button></div>`)}
    ${sec('Security', `<div class="setrow"><div><b>App Lock</b><small>${esc(HA.Security.status())}</small></div><button class="btn ghost sm" data-act="sec-manage">Manage</button></div>`)}
    ${arch.length ? sec('Archived protocols', arch.map(h => `<div class="setrow"><div style="display:flex;align-items:center;gap:.5rem"><div class="qicon" style="--qc:${colorOf(h.icon)};width:1.8rem;height:1.8rem;font-size:1.1rem">${ic(h.icon)}</div><div><b>${esc(h.name)}</b><small>Mastery is kept when you restore</small></div></div><button class="btn ghost sm" data-act="restore" data-id="${h.id}">${ic('restore')}Restore</button></div>`).join('')) : ''}
    ${sec('Data', `${item('lock', 'Export encrypted backup', 'AES-256, protected by your passphrase', 'export')}${item('download', 'Export plain backup', 'Readable file, keep it safe', 'export-plain')}${item('restore', 'Import backup', 'Encrypted or plain', 'import')}${item('trash', 'Reset all data', 'Erases everything on this device', 'reset', 'danger')}`, 'flush')}
    ${sec('App', `${install}${item('restore', 'Check for updates', '', 'update')}${item('info', 'What’s new', `Version ${esc(appVersion)}`, 'whatsnew')}`, 'flush')}
    <p class="ver">HunterArsenal v${esc(appVersion)}</p></div>`;
}

function dockHTML() {
  const n = (id, icon, label) => `<button data-act="nav" data-v="${id}" ${view === id ? 'aria-current="page"' : ''}>${ic(icon)}<span>${label}</span></button>`;
  return panel('nav', n('home', 'home', 'Home') + n('history', 'calendar', 'History') + n('stats', 'bars', 'Stats') + n('profile', 'user', 'Profile') + n('settings', 'gear', 'Settings'), '', 'nav');
}

let lastKey = '', lastTab = '';
function render() {
  const sc = $('#scroll'), top = sc ? sc.scrollTop : 0;
  const screens = { home: homeHTML, history: historyHTML, stats: statsHTML, profile: profileHTML, settings: settingsHTML };
  $('#app').innerHTML = `<main class="scroll" id="scroll" aria-live="off">${screens[view]()}</main><div class="dock">${dockHTML()}</div>`;
  const sc2 = $('#scroll'); sc2.scrollTop = top; popId = null;
  const key = view + '|' + (view === 'profile' ? profileSub : ''), tk = view === 'home' ? homeTab + '|' + bonusSub : '';
  if (key !== lastKey) sc2.classList.add('enter'); else if (tk !== lastTab) sc2.classList.add('swap');
  lastKey = key; lastTab = tk;
  if (view === 'profile' && profileSub === 'license') drawCard();
}
async function drawCard() {
  const cv = $('#card-canvas'); if (!cv) return;
  try { await HA.Card.render(G.getHunterCardData(S, today()), cv); } catch (e) { console.warn('card render failed', e); }
}

/* ============================== feedback ============================== */
function toast(msg) {
  const old = $('#layer .toast'); if (old) old.remove();
  const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
  $('#layer').appendChild(el); setTimeout(() => el.remove(), 2900);
}
function floatXP(x, y, txt) {
  const el = document.createElement('div'); el.className = 'floatxp'; el.textContent = txt; el.style.left = (x - 24) + 'px'; el.style.top = (y - 20) + 'px';
  $('#layer').appendChild(el); setTimeout(() => el.remove(), 1000);
}
function openSheet(inner, o) {
  o = o || {};
  $('#layer').innerHTML = `<div class="backdrop ${o.center ? 'center' : ''}" data-act="sheet-bg"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(o.label || 'Dialog')}">${panel('', inner)}</div></div>`;
  const f = $('#layer input, #layer textarea'); if (f && !o.nofocus) f.focus({ preventScroll: true });
}
const closeSheet = () => { draft = null; const bd = $('#layer .backdrop'); if (!bd) return; bd.classList.add('closing'); setTimeout(() => bd.remove(), 190); };
const sheetHead = (icon, title, sub, logo) => `<div class="sheet-head">${logo ? `<img src="assets/branding/hunterarsenal-logo.png" data-fallback="assets/fallback/logo-mark.svg" alt="">` : `<span class="qicon" style="width:2.6rem;height:2.6rem;font-size:1.6rem">${ic(icon)}</span>`}<div class="ttl"><h2>${title}</h2><p>${sub}</p></div><button class="xbtn" data-act="sheet-close" aria-label="Close">${ic('close')}</button></div>`;
const stat = (icon, label, val, color) => `<div class="nw-stat" style="--sc:${color || 'var(--accent)'}">${ic(icon)}<div><small>${label}</small><b>${val}</b></div></div>`;

/* ============================== state changes ============================== */
function mutate(fn) {
  const before = snap(), t = today();
  const res = fn();
  const ev = G.refreshDay(S, t);
  const { fresh } = G.checkUnlocks(S, t);
  const after = snap();
  save(); render();
  announce(before, after, ev, fresh);
  return res;
}
function announce(before, after, ev, fresh) {
  const rk = G.rankForLevel(after.level), cls = G.classInfo(G.attrXP(S));
  if (after.level > before.level) {
    Notice.show({ title: 'LEVEL INCREASE', subtitle: `LEVEL ${after.level}`, sound: 'levelup', bodyHTML: `<div class="nw-rows"><div><span>Rank</span><b>${rk.id}-Rank · ${esc(rk.title)}</b></div><div><span>Class</span><b>${esc(cls.name)}</b></div><div><span>Core XP</span><b>${fmt(G.totalXP(S))}</b></div></div>`, quote: 'Record updated.' });
    if (after.rankIdx > before.rankIdx) Notice.show({ title: 'PROMOTION', subtitle: `${rk.id}-RANK`, tone: rk.color, sound: 'rankup', bodyHTML: `<div class="nw-rows"><div><span>New rank</span><b>${rk.id}-Rank</b></div><div><span>Designation</span><b>${esc(rk.title)}</b></div></div>`, quote: 'Entry recorded.' });
  }
  G.ATTR_ORDER.forEach(a => {
    if (after.attrIdx[a] > before.attrIdx[a]) { const t = G.attrTier(a, G.attrXP(S)[a]);
      Notice.show({ title: 'TIER ADVANCED', subtitle: esc(t.name.toUpperCase()), tone: ac(a), sound: 'rankup', bodyHTML: `<div class="nw-head"><span class="qicon" style="--qc:${ac(a)}">${ic(G.ATTRS[a].icon)}</span><div><b>${a} — ${G.ATTRS[a].name}</b><span>Tier ${G.TIER_ROMAN[t.idx]} · ${esc(t.name)}</span></div></div>`, quote: `${G.ATTRS[a].name} readings updated.` }); }
  });
  Object.keys(after.mastery).forEach(id => { if (before.mastery[id] !== undefined && after.mastery[id] > before.mastery[id]) { const h = S.habits.find(x => x.id === id); if (h) setTimeout(() => toast(`${h.name}: mastery ${G.MASTERY[after.mastery[id]]}`), 600); } });
  if (ev.dqCompleted) Notice.show({ title: 'DAILY MISSION', subtitle: 'CLEARED', sound: 'unlock', bodyHTML: `<div class="nw-rows"><div><span>Reward</span><b>+${G.CONST.DAILY_QUEST_BONUS} Core XP</b></div></div>`, quote: 'Mission complete. Schedule your next one any time.' });
  else if (ev.becamePerfect) toast(`All protocols cleared! Continuity: ${liveCombo()}`);
  const ach = fresh.achievements.concat(fresh.challenges);
  if (ach.length === 1) { const a = ach[0]; Notice.show({ title: fresh.challenges.includes(a) ? 'CHALLENGE COMPLETE' : 'QUALIFICATION AWARDED', subtitle: esc(a.name), tone: a.tone, sound: 'unlock', bodyHTML: `<div class="nw-head"><span class="qicon" style="--qc:${a.tone}">${ic(a.icon)}</span><div><b>${esc(a.name)}</b><span>${esc(a.desc)}</span></div></div><div class="nw-rows"><div><span>Reward</span><b>+${a.reward} RC</b></div></div>` }); }
  else if (ach.length > 1) Notice.show({ title: 'UNLOCKED', subtitle: `${ach.length} NEW QUALIFICATIONS`, tone: ach[0].tone, sound: 'unlock', bodyHTML: `<ul class="nw-list">${ach.slice(0, 4).map(a => `<li>${ic(a.icon)}${esc(a.name)} <span style="margin-left:auto;color:var(--gold);font-weight:700">+${a.reward} RC</span></li>`).join('')}${ach.length > 4 ? `<li>…and ${ach.length - 4} more</li>` : ''}</ul><div class="nw-rows"><div><span>Total reward</span><b>+${ach.reduce((s, a) => s + a.reward, 0)} RC</b></div></div>`, quote: 'See Records for details.' });
  if (fresh.titles.length) Notice.show({ title: 'DESIGNATION GRANTED', subtitle: esc(fresh.titles[0].name), tone: '#b99a5c', sound: 'unlock', bodyHTML: `<ul class="nw-list">${fresh.titles.slice(0, 4).map(t => `<li>${ic(t.icon)}${esc(t.name)} <span style="color:#8c97a4">· ${esc(t.cat)}</span></li>`).join('')}${fresh.titles.length > 4 ? `<li>…and ${fresh.titles.length - 4} more</li>` : ''}</ul>`, quote: 'Assign it under Records → Designations.' });
}

/* compact, non-blocking "Habit Completed" System reward (full modals are kept for level-ups and unlocks) */
function rewardToast(h) {
  const old = $('#layer .rtoast'); if (old) old.remove();
  const el = document.createElement('div'); el.className = 'rtoast'; el.setAttribute('role', 'status'); el.style.setProperty('--ac', ac(h.attr));
  el.innerHTML = `<div class="rt-h">${ic('check')}<b>PROTOCOL COMPLETED</b><span>${esc(h.name)}</span></div><div class="rt-r"><span>+${G.CONST.HUNTER_XP} Core XP</span><span style="color:${ac(h.attr)}">+${G.CONST.ATTR_XP} ${h.attr} XP</span><span style="color:#8b7db3">+${G.CONST.MASTERY_XP} Mastery XP</span></div>`;
  $('#layer').appendChild(el); setTimeout(() => el.remove(), 2600);
}

function toggleHabit(id) {
  popId = id;
  const res = mutate(() => G.toggleHabit(S, id, today(), Date.now()));
  if (!res) return;
  if (res.done) { HA.Sound.play('check'); rewardToast(res.habit); if (navigator.vibrate) navigator.vibrate(12); }
}

/* ============================== habit form ============================== */
function habitPreview() {
  const d = draft, mx = d.id ? (G.masteryXPMap(S)[d.id] || 0) : 0;
  const sched = d.sched === 'custom' && d.days && d.days.length ? d.days.slice().sort().map(x => DOW[x]).join(' ') : 'Every day';
  return `<div class="qicon big" style="--qc:${colorOf(d.icon)}">${ic(d.icon)}</div><b>${esc(d.name) || 'Protocol name'}</b><span class="d">${esc(d.desc) || 'Short description'}</span>${atag(d.attr, true)}
    <ul><li>${ic('star')}<span style="color:#6fae8a;font-weight:700">+${G.CONST.HUNTER_XP} Core XP</span></li><li>${ic('calendar')}${esc(sched)}</li><li>${ic('trophy')}Mastery: ${G.masteryTier(mx).name}</li></ul>`;
}
function openHabitForm(id) {
  const h = id ? S.habits.find(x => x.id === id) : null;
  if (!h && G.activeHabits(S).length >= G.CONST.MAX_ACTIVE_HABITS) { limitNotice(); return; }
  menuHabit = null;
  draft = h ? { ...h, days: h.days ? [...h.days] : null, sched: h.days ? 'custom' : 'every', mode: 'edit', kind: 'habit' }
            : { id: null, mode: 'add', kind: 'habit', name: '', desc: '', icon: 'laptop', attr: 'INT', days: null, sched: 'every' };
  renderHabitForm();
}
function limitNotice() {
  Notice.show({ title: 'PROTOCOL LIMIT', subtitle: `${G.CONST.MAX_ACTIVE_HABITS} ACTIVE`, tone: '#b98a50', dismissible: true, bodyHTML: `<p style="margin:0;font-size:.85rem;color:#d5dbe2">You can keep up to ${G.CONST.MAX_ACTIVE_HABITS} active protocols. Archive or delete one to make room. Archived protocols keep their mastery.</p>` });
}
function renderHabitForm(keepFocus) {
  const d = draft, A = G.ATTRS[d.attr];
  openSheet(`${sheetHead('target', d.mode === 'add' ? 'Add New Protocol' : 'Edit Protocol', d.mode === 'add' ? 'Create a new hunter routine' : 'Update your routine', true)}
    <div class="two-col"><div>
      <div class="field"><label for="h-name">Protocol name <span class="cnt" id="h-ncnt">${d.name.length}/50</span></label><input id="h-name" class="input" maxlength="50" placeholder="e.g. Study Cybersecurity" value="${esc(d.name)}" data-input="h-name" autocomplete="off"></div>
      <div class="field"><label for="h-desc">Description (optional) <span class="cnt" id="h-dcnt">${d.desc.length}/100</span></label><textarea id="h-desc" class="input" maxlength="100" placeholder="e.g. THM / Labs / Notes" data-input="h-desc">${esc(d.desc)}</textarea></div></div>
      ${panel('preview', `<div id="h-preview">${habitPreview()}</div>`, 'aria-label="Protocol preview" aria-live="polite"')}</div>
    <div class="field"><span class="lab">Icon</span><div class="icon-pick" role="group" aria-label="Icon">${PICK_HABIT.map(i => `<button aria-pressed="${d.icon === i}" data-act="h-icon" data-v="${i}" aria-label="${i}">${ic(i)}</button>`).join('')}</div></div>
    <div class="field"><span class="lab">Attribute (stat)</span><div class="attr-pick" role="group" aria-label="Attribute">${G.ATTR_ORDER.map(a => `<button style="--ac:${ac(a)}" aria-pressed="${d.attr === a}" data-act="h-attr" data-v="${a}">${ic(G.ATTRS[a].icon)}${a}</button>`).join('')}</div>
      <div class="attr-desc" style="--ac:${ac(d.attr)}">${ic(A.icon)}<div><b>${d.attr} — ${A.name.toUpperCase()}</b><small>${A.blurb}</small></div></div></div>
    <div class="field"><span class="lab">Reward</span><div class="reward-box"><span>${ic('star')}+${G.CONST.HUNTER_XP} Core XP</span><span style="color:${ac(d.attr)}">+${G.CONST.ATTR_XP} ${d.attr} XP</span><span style="color:#8b7db3">+${G.CONST.MASTERY_XP} Mastery XP</span></div></div>
    <div class="field"><label for="h-sched">Schedule</label><select id="h-sched" class="input" data-change="h-sched"><option value="every" ${d.sched === 'every' ? 'selected' : ''}>Every day</option><option value="custom" ${d.sched === 'custom' ? 'selected' : ''}>Specific days</option></select>
      ${d.sched === 'custom' ? `<div class="dowpick" role="group" aria-label="Days">${DOW.map((x, i) => `<button aria-pressed="${!!(d.days && d.days.includes(i))}" data-act="h-day" data-v="${i}" aria-label="${DOWN[i]}">${x}</button>`).join('')}</div>` : ''}</div>
    <div class="sheet-actions"><button class="btn ghost" data-act="sheet-close">Cancel</button><button class="btn" data-act="h-save">${d.mode === 'add' ? 'Create Protocol' : 'Save'}</button></div>
    ${d.mode === 'edit' ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-top:.6rem"><button class="btn ghost" data-act="h-archive">${ic('archive')}Archive</button><button class="btn danger" data-act="del-habit" data-id="${d.id}">${ic('trash')}Delete</button></div>` : ''}`, { label: 'Protocol form', nofocus: keepFocus });
}
function syncDraftText() { const n = $('#h-name') || $('#s-name'), s = $('#h-desc') || $('#s-desc'); if (n) draft.name = n.value; if (s) draft.desc = s.value; }
function saveHabit() {
  syncDraftText(); const d = draft, name = d.name.trim();
  if (!name) { toast('Give your protocol a name'); const n = $('#h-name'); if (n) n.focus(); return; }
  let days = null;
  if (d.sched === 'custom') { days = (d.days || []).slice().sort(); if (!days.length) { toast('Pick at least one day'); return; } if (days.length === 7) days = null; }
  const fields = { name, desc: d.desc.trim(), icon: d.icon, attr: d.attr, days };
  if (d.mode === 'add') {
    if (G.activeHabits(S).length >= G.CONST.MAX_ACTIVE_HABITS) { closeSheet(); limitNotice(); return; }
    const h = { id: Store.uid(), created: today(), archived: false, ...fields };
    closeSheet(); mutate(() => { S.habits.push(h); });
    Notice.show({ title: 'NEW PROTOCOL', subtitle: 'REGISTERED', sound: 'notice', primary: { label: 'OK' },
      bodyHTML: `<div class="nw-head"><span class="qicon" style="--qc:${colorOf(h.icon)}">${ic(h.icon)}</span><div><b>${esc(h.name)}</b><span>${esc(h.desc || G.ATTRS[h.attr].name)}</span></div></div>
        <div class="nw-stats">${stat(G.ATTRS[h.attr].icon, 'Attribute', `${h.attr} — ${G.ATTRS[h.attr].name.toUpperCase()}`, ac(h.attr))}${stat('star', 'Core XP', `+${G.CONST.HUNTER_XP} XP`, '#6fae8a')}${stat('calendar', 'Schedule', h.days ? h.days.map(x => DOW[x]).join(' ') : 'Every day', '#e6ebf0')}${stat('trophy', 'Mastery', 'AWAKENED', '#8b7db3')}</div>`, quote: 'Protocol logged.' });
  } else {
    closeSheet(); mutate(() => { const h = S.habits.find(x => x.id === d.id); if (h) Object.assign(h, fields); }); toast('Protocol saved');
  }
}
function archiveHabit() {
  const id = draft.id; closeSheet(); mutate(() => { const h = S.habits.find(x => x.id === id); if (h) h.archived = true; }); toast('Archived. Restore it any time from Settings.');
}
function confirmDelete(kind, id) {
  const item = (kind === 'habit' ? S.habits : S.skills).find(x => x.id === id); if (!item) return;
  Notice.show({ title: kind === 'habit' ? 'DELETE PROTOCOL?' : 'DELETE SKILL?', tone: '#b5575f', sound: 'penalty', dismissible: true,
    bodyHTML: `<div class="nw-head"><span class="qicon" style="--qc:${colorOf(item.icon)}">${ic(item.icon)}</span><div><b>${esc(item.name)}</b><span>${kind === 'habit' ? 'Your XP and history are kept. Protocol mastery for this protocol is removed. Use Archive to keep mastery.' : 'Its practice log will be removed.'}</span></div></div>`,
    secondary: { label: 'CANCEL' }, primary: { label: 'DELETE', onClick: () => { closeSheet(); mutate(() => { if (kind === 'habit') S.habits = S.habits.filter(x => x.id !== id); else { S.skills = S.skills.filter(x => x.id !== id); S.skillLog = S.skillLog.filter(e => e.id !== id); } }); toast('Deleted'); } } });
}

/* ============================== skill form ============================== */
function openSkillForm(id) {
  const s = id ? S.skills.find(x => x.id === id) : null; menuSkill = null;
  draft = s ? { ...s, mode: 'edit', kind: 'skill' } : { id: null, mode: 'add', kind: 'skill', name: '', desc: '', icon: 'book', attr: 'INT' };
  renderSkillForm();
}
function renderSkillForm(keepFocus) {
  const d = draft;
  openSheet(`${sheetHead('book', d.mode === 'add' ? 'Add Skill' : 'Edit Skill', 'Learn, improve, master a new skill.')}
    <div class="field"><label for="s-name"><span>1 · Skill name</span><span class="cnt" id="s-ncnt">${d.name.length}/50</span></label><input id="s-name" class="input" maxlength="50" placeholder="e.g. Cybersecurity, Python Programming, Fitness" value="${esc(d.name)}" data-input="s-name" autocomplete="off"></div>
    <div class="field"><label for="s-desc"><span>2 · Description (optional)</span><span class="cnt" id="s-dcnt">${d.desc.length}/100</span></label><textarea id="s-desc" class="input" maxlength="100" placeholder="e.g. Ethical hacking, THM, labs, bug bounty" data-input="s-desc">${esc(d.desc)}</textarea></div>
    <div class="field"><span class="lab">3 · Attribute</span><div class="attr-pick" role="group" aria-label="Attribute">${G.ATTR_ORDER.map(a => `<button style="--ac:${ac(a)}" aria-pressed="${d.attr === a}" data-act="s-attr" data-v="${a}">${ic(G.ATTRS[a].icon)}${a}</button>`).join('')}</div>
      <div class="attr-desc" style="--ac:${ac(d.attr)}">${ic(G.ATTRS[d.attr].icon)}<div><b>${d.attr} — ${G.ATTRS[d.attr].name.toUpperCase()}</b><small>${G.ATTRS[d.attr].blurb}</small></div></div></div>
    <div class="field"><span class="lab">4 · Icon</span><div class="icon-pick" role="group" aria-label="Icon">${PICK_SKILL.map(i => `<button aria-pressed="${d.icon === i}" data-act="s-icon" data-v="${i}" aria-label="${i}">${ic(i)}</button>`).join('')}</div></div>
    <div class="sheet-actions"><button class="btn ghost" data-act="sheet-close">Cancel</button><button class="btn" data-act="s-save">${d.mode === 'add' ? 'Create Skill' : 'Save'}</button></div>
    ${d.mode === 'edit' ? `<button class="btn danger" data-act="del-skill" data-id="${d.id}" style="margin-top:.6rem">${ic('trash')}Delete</button>` : ''}`, { label: 'Skill form', nofocus: keepFocus });
}
function saveSkill() {
  syncDraftText(); const d = draft, name = d.name.trim();
  if (!name) { toast('Give your skill a name'); return; }
  const f = { name, desc: d.desc.trim(), icon: d.icon, attr: d.attr };
  closeSheet();
  mutate(() => { if (d.mode === 'add') S.skills.push({ id: Store.uid(), created: today(), ...f }); else { const s = S.skills.find(x => x.id === d.id); if (s) Object.assign(s, f); } });
  toast(d.mode === 'add' ? 'Skill added. Log practice from its menu.' : 'Skill saved');
}

/* ============================== modals: rank, class, day, titles, themes ============================== */
function rankModal() {
  const xp = G.totalXP(S), li = G.levelInfo(xp), rp = G.rankProgress(xp), rk = rp.rank;
  openSheet(`${sheetHead('arrowup', `${rk.id}-Rank`, esc(rk.title))}
    <div class="kv" style="margin-bottom:.6rem"><div><span>Level</span><b>${li.level}${li.max ? ' (MAX)' : ' / ' + G.CONST.MAX_LEVEL}</b></div><div><span>Total Core XP</span><b>${fmt(xp)}</b></div><div><span>${li.max ? 'Level progress' : 'To next level'}</span><b>${li.max ? 'Max level reached' : `${fmt(li.cur)} / ${fmt(li.need)} XP`}</b></div><div><span>${rp.max ? 'Rank' : `To ${rp.next.id}-Rank`}</span><b>${rp.max ? 'Highest rank' : `${fmt(rp.nextXP - xp)} XP`}</b></div></div>
    <div class="bar" style="margin-bottom:.8rem" aria-hidden="true"><i style="width:${li.pct}%"></i></div>
    <div class="ladder" role="list" aria-label="Rank ladder">${G.RANKS.map((r, i) => { const nx = G.RANKS[i + 1], hi = nx ? nx.minLevel - 1 : G.CONST.MAX_LEVEL;
      return `<div class="lrow ${r.id === rk.id ? 'cur' : ''}" role="listitem" style="--rc:${r.color}"><div class="rk">${r.id}</div><div><b>${r.id}-Rank · ${esc(r.title)}</b><small>Level ${r.minLevel}–${hi}${li.level >= r.minLevel ? ' · reached' : ''}</small></div><div class="mult">${fmt(G.rankStartXP(i))} XP</div></div>`; }).join('')}</div>
    <p class="note" style="margin-top:.6rem">Every protocol gives the same Core XP at every rank. There are no rank multipliers.</p>`, { label: 'Rank details', nofocus: true });
}
function classModal(tab) {
  const ax = G.attrXP(S), cls = G.classInfo(ax), a = tab && G.ATTRS[tab] ? tab : (classTab || cls.attr); classTab = a;
  const A = G.ATTRS[a], t = G.attrTier(a, ax[a]);
  openSheet(`${sheetHead(A.icon, 'Attribute Class', `Dominant: ${cls.attr} · ${esc(cls.name)}`)}
    <div class="ctabs" role="tablist" aria-label="Attributes">${G.ATTR_ORDER.map(x => `<button role="tab" style="--ac:${ac(x)}" aria-selected="${x === a}" data-act="class-tab" data-a="${x}">${x}</button>`).join('')}</div>
    <div class="chead" style="--ac:${A.color}">${ic(A.icon)}<div><small>${a} — ${A.name.toUpperCase()}</small><b>${esc(t.name)}</b><em>Tier ${G.TIER_ROMAN[t.idx]} · ${t.max ? `${fmt(ax[a])} XP · MAX` : `${fmt(ax[a])} / ${fmt(t.next)} XP`}</em></div></div>
    <div class="bar" style="margin:.5rem 0 .8rem;--bar:${A.color}" aria-hidden="true"><i style="width:${t.pct}%;background:${A.color};box-shadow:0 0 .6rem ${A.color}4d"></i></div>
    <div class="tiers" role="list" style="--ac:${A.color}">${A.classes.map((n, i) => `<div class="trow2 ${i === t.idx ? 'cur' : ''} ${i < t.idx ? 'done' : ''}" role="listitem"><span class="rn">${G.TIER_ROMAN[i]}</span><div><b>${esc(n)}</b><small>${fmt(G.CONST.ATTR_TIER_STARTS[i])} XP</small></div>${i < t.idx ? ic('check') : i === t.idx ? '<span class="here">NOW</span>' : ic('lock')}</div>`).join('')}</div>
    ${cls.versatile ? `<div class="vers-note" style="margin-top:.6rem"><b>VERSATILE</b> ${cls.sorted[0].a} and ${cls.sorted[1].a} are closely matched. A label only; it changes nothing.</div>` : ''}`, { label: 'Attribute class', nofocus: true });
}
function masteryModal(id) {
  const h = S.habits.find(x => x.id === id); if (!h) return;
  const mx = G.masteryXPMap(S)[id] || 0, t = G.masteryTier(mx), st = G.habitStats(S, h, today());
  openSheet(`${sheetHead(h.icon, 'Protocol Mastery', esc(h.name))}
    <div class="chead" style="--ac:#8b7db3">${ic('trophy')}<div><small>${atag(h.attr)} · Continuity ${st.streak}d · ${st.total} check-ins</small><b>${t.name}</b><em>Level ${t.no} · ${t.max ? `${fmt(mx)} XP · MAX` : `${fmt(mx)} / ${fmt(t.next)} XP`}</em></div></div>
    <div class="bar" style="margin:.5rem 0 .8rem" aria-hidden="true"><i style="width:${t.pct}%"></i></div>
    <div class="tiers" role="list" style="--ac:#8b7db3">${G.MASTERY.map((n, i) => `<div class="trow2 ${i === t.idx ? 'cur' : ''} ${i < t.idx ? 'done' : ''}" role="listitem"><span class="rn">${i + 1}</span><div><b>${n}</b><small>${fmt(G.CONST.MASTERY_STARTS[i])} Mastery XP</small></div>${i < t.idx ? ic('check') : i === t.idx ? '<span class="here">NOW</span>' : ic('lock')}</div>`).join('')}</div>
    <p class="note" style="margin-top:.6rem">Each check-in adds +${G.CONST.MASTERY_XP} Mastery XP to this protocol. Archived protocols keep their mastery.</p>`, { label: 'Protocol mastery', nofocus: true });
}
function dayModal(d) {
  const r = S.days[d] || {}, comps = S.completions[d] || {};
  const rows = Object.keys(comps).map(id => { const h = S.habits.find(x => x.id === id); return `<div class="drow"><div class="qicon" style="--qc:${colorOf(h ? h.icon : 'check')}">${ic(h ? h.icon : 'check')}</div>${esc(h ? h.name : 'Removed protocol')}<span>+${comps[id].xp} XP</span></div>`; });
  if (r.dq) rows.push(`<div class="drow"><div class="qicon">${ic('bolt')}</div>Daily Mission cleared<span>+${r.dq} XP</span></div>`);
  if (r.penalty) rows.push(`<div class="drow"><div class="qicon" style="--qc:#b5575f">${ic('close')}</div>Deviation<span class="neg">−${r.penalty} XP</span></div>`);
  if (r.frozen) rows.push(`<div class="drow"><div class="qicon">${ic('shield')}</div>Contingency used<span style="color:var(--accent)">Saved</span></div>`);
  openSheet(`${sheetHead('calendar', fmtDate(d, { weekday: 'long', month: 'short', day: 'numeric' }), 'Day summary')}${rows.join('') || '<div class="empty"><b>Nothing logged</b>No activity on this day.</div>'}`, { label: 'Day summary', nofocus: true });
}
function titleSheet(id) {
  const t = G.TITLES.find(x => x.id === id); if (!t) return;
  const ctx = G.context(S, today()), at = S.unlocked.titles[id], eq = currentTitle(), isEq = eq && eq.id === id, p = Math.min(t.target, Math.floor(t.progress(ctx)));
  openSheet(`${sheetHead(at ? t.icon : 'lock', esc(t.name), esc(t.cat) + ' designation')}
    <div class="kv"><div><span>Status</span><b style="color:${isEq ? '#6fae8a' : at ? 'var(--accent)' : '#7d8895'}">${isEq ? 'Assigned' : at ? 'Unlocked' : 'Locked'}</b></div><div><span>Requirement</span><b>${esc(t.desc)}</b></div>${at ? `<div><span>Unlocked</span><b>${fmtDate(G.keyOf(new Date(at)), { month: 'short', day: 'numeric', year: 'numeric' })}</b></div>` : `<div><span>Progress</span><b>${fmt(p)} / ${fmt(t.target)}</b></div>`}</div>
    ${at ? '' : `<div class="bar" style="margin-top:.6rem"><i style="width:${(p / t.target) * 100}%"></i></div>`}
    <div class="sheet-actions"><button class="btn ghost" data-act="sheet-close">Close</button>${at && !isEq ? `<button class="btn" data-act="equip-title" data-id="${id}">Assign designation</button>` : `<button class="btn ghost" disabled style="opacity:.5">${isEq ? 'Assigned' : 'Locked'}</button>`}</div>`, { label: 'Designation details', nofocus: true });
}
function equipTitle(id) {
  const t = G.TITLES.find(x => x.id === id); if (!t || !S.unlocked.titles[id]) return; closeSheet();
  Notice.show({ title: 'ASSIGN DESIGNATION?', subtitle: esc(t.name), tone: '#b99a5c', dismissible: true, bodyHTML: `<div class="nw-head"><span class="qicon" style="--qc:#b99a5c">${ic(t.icon)}</span><div><b>${esc(t.name)}</b><span>${esc(t.desc)}</span></div></div>`, secondary: { label: 'CANCEL' },
    primary: { label: 'ASSIGN', onClick: () => { S.profile.equippedTitle = id; save(); render(); Notice.show({ title: 'DESIGNATION ASSIGNED', subtitle: esc(t.name), tone: '#b99a5c', sound: 'unlock', bodyHTML: `<div class="nw-rows"><div><span>Assigned</span><b>${esc(t.name)}</b></div></div>`, quote: 'Designation applied to profile.' }); } } });
}
function themeOpen(id) {
  const th = G.THEMES.find(x => x.id === id); if (!th) return;
  const ctx = G.context(S, today()), st = G.themeStatus(S, th, ctx);
  const equip = () => { S.settings.theme = id; save(); applyTheme(); render(); toast(`${th.name} theme equipped`); };
  if (S.settings.theme === id) return toast(`${th.name} is already equipped`);
  if (st.owned) return equip();
  if (st.buy) {
    const bal = G.hcBalance(S).balance;
    if (bal < st.cost) return Notice.show({ title: 'NOT ENOUGH RC', tone: '#b5575f', dismissible: true, bodyHTML: `<div class="nw-rows"><div><span>${esc(th.name)} theme</span><b>${st.cost} RC</b></div><div><span>Your balance</span><b>${fmt(bal)} RC</b></div></div><p style="margin:.6rem 0 0;font-size:.78rem;color:#aeb7c2">Earn Research Credits from qualifications and challenges.</p>` });
    return Notice.show({ title: 'UNLOCK DISPLAY MODE?', subtitle: esc(th.name), dismissible: true, bodyHTML: `<div class="nw-rows"><div><span>Cost</span><b>${st.cost} RC</b></div><div><span>Balance after</span><b>${fmt(bal - st.cost)} RC</b></div></div>`, secondary: { label: 'CANCEL' },
      primary: { label: 'UNLOCK', onClick: () => { S.purchases.push({ id, cost: st.cost, at: Date.now() }); S.settings.theme = id; save(); applyTheme(); render(); toast(`${th.name} unlocked and equipped`); } } });
  }
  Notice.show({ title: 'DISPLAY MODE LOCKED', subtitle: esc(th.name), dismissible: true, bodyHTML: `<div class="nw-rows"><div><span>Requirement</span><b>${esc(st.label || 'Locked')}</b></div></div>` });
}

/* ============================== daily quest ============================== */
function showDQ() {
  if (S.dailyQuest.state !== 'available') return;
  const sched = G.scheduledHabits(S, today());
  Notice.show({ title: 'DAILY MISSION', subtitle: 'AVAILABLE', sound: 'notice',
    bodyHTML: `<ul class="nw-list">${sched.length ? sched.slice(0, 6).map(h => `<li>${ic(h.icon)}${esc(h.name)}</li>`).join('') + (sched.length > 6 ? `<li>…and ${sched.length - 6} more</li>` : '') : '<li>No protocols scheduled today. Add a protocol first.</li>'}</ul>
      <div class="nw-rows"><div><span>Reward</span><b>+${G.CONST.DAILY_QUEST_BONUS} XP</b></div><div><span>If you fail</span><b style="color:#c58790">−${G.CONST.DAILY_QUEST_FAIL_PENALTY} XP</b></div></div>`,
    quote: 'Clear every scheduled protocol before the day ends.',
    secondary: { label: 'DECLINE', onClick: () => { G.dqDecline(S); save(); render(); toast('Daily Mission declined'); } },
    primary: { label: 'ACCEPT', onClick: () => { G.dqAccept(S, today()); mutate(() => {}); toast('Daily Mission accepted'); } } });
}
function reportEvents(events) {
  if (!events || !events.length) return;
  const f = events.find(e => e.type === 'dqFailed');
  if (f) Notice.show({ title: 'DAILY MISSION', subtitle: 'FAILED', tone: '#b5575f', sound: 'penalty', bodyHTML: `<div class="nw-rows"><div><span>Deviation</span><b>−${G.CONST.DAILY_QUEST_FAIL_PENALTY} XP</b></div></div>`, quote: 'Schedule another mission in Settings when you are ready.' });
  const pen = events.filter(e => e.type === 'penalty').reduce((a, e) => a + e.xp, 0), lost = events.find(e => e.type === 'comboLost');
  if (events.some(e => e.type === 'frozen')) toast('A contingency protected your continuity');
  else if (lost) toast(`Continuity lost (${lost.combo} days)${pen ? ` · −${pen} XP` : ''}`);
  else if (pen) toast(`Missed protocols cost ${pen} XP`);
  else if (events.some(e => e.type === 'freeze')) toast('Contingency earned!');
}

/* ============================== onboarding & misc notices ============================== */
const fmtTime = hhmm => { const [h, m] = hhmm.split(':').map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
const dqUI = { mode: null, time: null };
function dqFormHTML(w) {
  const dq = S.dailyQuest;
  if (dqUI.mode === null) dqUI.mode = !dq.repeat && dq.state === 'scheduled' ? 'once' : 'every';
  const time = dqUI.time || dq.repeat || '08:00', every = dqUI.mode === 'every';
  const when = dq.at ? new Date(dq.at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : '';
  const status = dq.repeat ? `Every day at ${fmtTime(dq.repeat)}` : dq.state === 'scheduled' ? `One time: ${when}` : 'Not set';
  return `<div class="dqform" data-w="${w}">
    <div class="setrow"><div><b>Status</b><small>${esc(status)}</small></div><span class="chipstat ${dq.state}">${DQ_LABEL[dq.state]}</span></div>
    <div class="setrow"><div><b><label for="dq-time-${w}">Mission time</label></b><small>${every ? 'Arrives at this time every day' : 'One mission, today only'}</small></div><input id="dq-time-${w}" class="input dq-time" type="time" value="${time}"></div>
    <div class="setrow"><div><b>Repeat</b><small>${every ? 'No need to set it again' : 'Needs a time later today'}</small></div><div class="seg" role="group" aria-label="Repeat"><button aria-pressed="${!every}" data-act="dq-mode" data-v="once">Today</button><button aria-pressed="${every}" data-act="dq-mode" data-v="every">Every day</button></div></div>
    <div class="setbtns"><button class="btn" data-act="dq-save">${dq.repeat || dq.state === 'scheduled' ? 'Update time' : 'Save mission time'}</button>${dq.repeat || dq.state === 'scheduled' ? '<button class="btn ghost" data-act="dq-off">Turn off</button>' : ''}</div></div>`;
}
function dqSheet() {
  const dq = S.dailyQuest, t = today(), list = G.scheduledHabits(S, t), done = id => !!(S.completions[t] && S.completions[t][id]);
  openSheet(`${sheetHead('scroll', 'Daily Mission', DQ_LABEL[dq.state])}
    <div class="kv" style="margin-bottom:.6rem"><div><span>Goal</span><b>Clear every scheduled protocol today</b></div><div><span>Reward</span><b style="color:var(--gold)">+${G.CONST.DAILY_QUEST_BONUS} Core XP</b></div><div><span>If you fail</span><b style="color:#c58790">${G.CONST.DAILY_QUEST_FAIL_PENALTY} Core XP</b></div><div><span>Missions cleared</span><b>${dq.completed || 0}</b></div></div>
    <p class="note" style="text-align:left;padding:0 0 .5rem">Daily Missions only give Core XP, never attribute or mastery XP.</p>
    <div class="field"><span class="lab">Today’s protocols</span>${list.map(h => `<div class="drow"><div class="qicon" style="--qc:${ac(h.attr)}">${ic(done(h.id) ? 'check' : G.ATTRS[h.attr].icon)}</div>${esc(h.name)}<span style="${done(h.id) ? '' : 'color:#76818e'}">${done(h.id) ? 'Done' : 'To do'}</span></div>`).join('') || '<div class="empty" style="padding:.5rem 0">No protocols scheduled today.</div>'}</div>
    ${dq.state === 'available' ? `<button class="btn" data-act="dq-respond" style="margin-bottom:.6rem">Respond to mission</button>` : ''}
    ${dqFormHTML('sheet')}`, { label: 'Daily Mission', nofocus: true });
}

/* ---------- onboarding: welcome -> create hunter -> starter habits -> system initialised ---------- */
const STARTERS = [{ name: '50 Push-ups', desc: '50 reps', icon: 'dumbbell', attr: 'STR' }, { name: '50 Sit-ups', desc: '50 reps', icon: 'dumbbell', attr: 'STR' }, { name: '2 km Run', desc: '2 km', icon: 'run', attr: 'VIT' }];
let ob = null;
function openOnboarding() { ob = ob || { step: 'welcome', name: '', bd: '', ls: 80, starters: STARTERS.map(() => true) }; renderOb(); }
function renderOb() {
  let inner;
  if (ob.step === 'welcome') {
    inner = `<div class="ob-hero"><img src="assets/branding/hunterarsenal-logo.png" data-fallback="assets/fallback/logo-emblem.svg" alt=""><h2>HUNTER ACCESS</h2><p>A human research program.<br>Log protocols. Build consistency. Measure progress.</p></div>
      <button class="btn" data-act="ob-next">Initialize</button><button class="btn ghost" data-act="import">Already a Hunter? Import backup</button>`;
  } else if (ob.step === 'create') {
    inner = `${sheetHead('user', 'Create your Hunter', 'Every Hunter begins at Level 1', true).replace(/<button class="xbtn".*?<\/button>/, '')}
      <div class="ob-avatar"><span class="avatar">${avatarInner()}</span><button class="btn ghost sm" data-act="ob-photo">${ic('camera')}Choose photo</button></div>
      <div class="field"><label for="o-name">Hunter name</label><input id="o-name" class="input" maxlength="24" placeholder="Hunter" value="${esc(ob.name)}" data-input="ob-name" autocomplete="off"></div>
      <div class="field"><label for="o-id">Hunter ID (auto-generated)</label><input id="o-id" class="input mono" value="${esc(S.profile.hunterId)}" readonly></div>
      <div class="field"><label for="o-bd">Birthdate (for the Mission Clock)</label><input id="o-bd" type="date" class="input" value="${esc(ob.bd)}" data-input="ob-bd"></div>
      <div class="field"><label for="o-ls">Estimated lifespan (years)</label><input id="o-ls" type="number" min="30" max="120" class="input" value="${ob.ls}" data-input="ob-ls"></div>
      <div class="sheet-actions"><button class="btn ghost" data-act="ob-back">Back</button><button class="btn" data-act="ob-next">Continue</button></div>`;
  } else {
    inner = `${sheetHead('list', 'Starter Protocols', 'Initial protocols', true).replace(/<button class="xbtn".*?<\/button>/, '')}
      <div class="starters">${STARTERS.map((h, i) => `<button class="starter" role="checkbox" aria-checked="${ob.starters[i]}" data-act="ob-starter" data-i="${i}"><span class="qicon" style="--qc:${ac(h.attr)}">${ic(h.icon)}</span><span class="qtext"><b>${h.name}</b><span>Daily · ${h.desc}</span></span>${atag(h.attr)}<span class="tick">${ic('check')}</span></button>`).join('')}</div>
      <p class="note" style="margin:.5rem 0">You can edit or delete these later. Up to ${G.CONST.MAX_ACTIVE_HABITS} active protocols.</p>
      <div class="sheet-actions"><button class="btn ghost" data-act="ob-back">Back</button><button class="btn" data-act="ob-finish">Begin Program</button></div>`;
  }
  openSheet(inner, { label: 'Welcome', nofocus: ob.step !== 'create' });
  const bg = $('#layer .backdrop'); if (bg) { bg.removeAttribute('data-act'); bg.classList.add('center'); }
}
function finishOnboarding() {
  const n = ob.name.trim(), b = ob.bd, ls = Math.min(120, Math.max(30, Number(ob.ls) || 80));
  if (n) S.profile.name = n.slice(0, 24); S.profile.birthdate = /^\d{4}-\d{2}-\d{2}$/.test(b) ? b : ''; S.profile.lifespan = ls;
  let added = 0; STARTERS.forEach((h, i) => { if (ob.starters[i]) { S.habits.push({ id: Store.uid(), created: today(), archived: false, days: null, ...h }); added++; } });
  S.meta.onboarded = true; S.meta.lastSeenVersion = window.APP_VERSION; ob = null; G.refreshDay(S, today()); save(); closeSheet(); render();
  Notice.show({ title: 'SYSTEM', subtitle: 'INITIALIZED', sound: 'unlock', primary: { label: 'ENTER SYSTEM' },
    bodyHTML: `<ul class="nw-list"><li>${ic('check')}Hunter identified <span style="margin-left:auto;font-family:var(--font-mono);color:var(--tone)">${esc(S.profile.hunterId)}</span></li><li>${ic('check')}System linked <span style="margin-left:auto;color:#8c97a4">on this device</span></li><li>${ic('check')}Starter protocols added <span style="margin-left:auto;color:#8c97a4">${added}</span></li><li>${ic('check')}Ready for assignment</li></ul>`, quote: 'Discipline is the system.' });
}
function whatsNew(force) {
  const entry = (window.CHANGELOG || [])[0]; if (!entry) return;
  Notice.show({ title: force ? 'WHAT’S NEW' : 'UPDATED', subtitle: `v${esc(entry.version)}`, bodyHTML: `<ul class="nw-list">${entry.notes.map(n => `<li>${ic('check')}${esc(n)}</li>`).join('')}</ul>` });
}
function hcInfo() {
  const b = G.hcBalance(S);
  Notice.show({ title: 'RESEARCH CREDITS', dismissible: true, tone: '#b99a5c', bodyHTML: `<div class="nw-rows"><div><span>Balance</span><b>${fmt(b.balance)} RC</b></div><div><span>Earned</span><b>${fmt(b.earned)} RC</b></div><div><span>Spent</span><b>${fmt(b.spent)} RC</b></div></div><p style="margin:.6rem 0 0;font-size:.78rem;color:#aeb7c2">RC is a cosmetic currency earned from qualifications and operations. It only unlocks display modes. It never buys XP, levels or attributes.</p>` });
}

/* ============================== photo, backup ============================== */
function pickAvatar(cb) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = () => {
    const f = inp.files[0]; if (!f || !/^image\//.test(f.type)) return;
    const img = new Image(), url = URL.createObjectURL(f);
    img.onload = () => {
      const s = 256, c = document.createElement('canvas'); c.width = c.height = s; const m = Math.min(img.width, img.height);
      c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s);
      S.profile.avatar = c.toDataURL('image/jpeg', .86); URL.revokeObjectURL(url); save(); render(); if (cb) cb(); else toast('Photo updated');
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast('Could not read that image'); };
    img.src = url;
  };
  inp.click();
}
function exportData() {
  const blob = new Blob([Store.exportJSON(S)], { type: 'application/json' });
  HA.Card.download(blob, `hunterarsenal-backup-${today()}.json`); toast('Backup exported');
}
async function exportEncrypted() {
  const pw = await HA.Security.askPassphrase({ title: 'ENCRYPT BACKUP', confirm: true });
  if (!pw) return;
  toast('Encrypting backup');
  try {
    const env = await HA.Security.encryptBackup(Store.exportJSON(S), pw);
    HA.Card.download(new Blob([env], { type: 'application/json' }), `hunterarsenal-backup-${today()}.enc.json`); toast('Encrypted backup exported');
  } catch (e) { toast('Encryption is not available in this browser'); }
}
function importData() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
  inp.onchange = async () => {
    try {
      let text = await inp.files[0].text();
      if (HA.Security.isEncrypted(text)) {
        for (let tries = 0; ; tries++) {
          const pw = await HA.Security.askPassphrase({ title: 'DECRYPT BACKUP' });
          if (!pw) return;
          try { text = await HA.Security.decryptBackup(text, pw); break; }
          catch (e) { toast('Wrong passphrase, or the file is damaged'); if (tries >= 4) return; }
        }
      }
      const next = Store.importJSON(text);
      Notice.show({ title: 'RESTORE BACKUP?', tone: '#b98a50', dismissible: true, bodyHTML: `<div class="nw-rows"><div><span>Protocols</span><b>${next.habits.length}</b></div><div><span>Check-ins</span><b>${Object.values(next.completions).reduce((a, d) => a + Object.keys(d).length, 0)}</b></div></div><p style="margin:.6rem 0 0;font-size:.78rem;color:#aeb7c2">This replaces everything currently on this device.</p>`,
        secondary: { label: 'CANCEL' }, primary: { label: 'RESTORE', onClick: () => { S = next; S.meta.onboarded = true; ob = null; closeSheet(); const r = G.processDays(S, today()); G.refreshDay(S, today()); save(); applyTheme(); render(); toast('Backup restored'); reportEvents(r.events); } } });
    } catch (e) { toast('That file is not a valid HunterArsenal backup'); }
  };
  inp.click();
}
function resetAll() {
  Notice.show({ title: 'RESET ALL DATA?', tone: '#b5575f', sound: 'penalty', dismissible: true, bodyHTML: '<p style="margin:0;font-size:.85rem;color:#d5dbe2">Every protocol, XP, designation and setting on this device will be deleted. Export a backup first if you might want it back.</p>',
    secondary: { label: 'CANCEL' }, primary: { label: 'RESET', onClick: () => { Store.wipe(); S = Store.defaults(); ob = null; view = 'home'; homeTab = 'today'; bonusSub = null; profileSub = null; applyTheme(); render(); openOnboarding(); } } });
}

/* ============================== events ============================== */
document.addEventListener('error', (e) => { const t = e.target; if (t && t.tagName === 'IMG' && t.dataset && t.dataset.fallback && !t.dataset.fb) { t.dataset.fb = '1'; t.src = t.dataset.fallback; } }, true);

document.addEventListener('click', (e) => {
  if ((menuSkill || menuHabit) && !e.target.closest('.menu') && !e.target.closest('[data-act="skill-menu"],[data-act="habit-menu"]')) { menuSkill = null; menuHabit = null; render(); }
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, d = el.dataset;
  switch (act) {
    case 'nav': view = d.v; menuHabit = null; menuSkill = null; if (view !== 'profile') profileSub = null; if (view === 'home') bonusSub = null; closeSheet(); render(); $('#scroll').scrollTop = 0; break;
    case 'tab': homeTab = d.t; bonusSub = null; menuSkill = null; render(); break;
    case 'toggle': toggleHabit(d.id); break;
    case 'mastery-open': masteryModal(d.id); break;
    case 'habit-menu': menuHabit = menuHabit === d.id ? null : d.id; render(); break;
    case 'archive-habit': menuHabit = null; mutate(() => { const h = S.habits.find(x => x.id === d.id); if (h) h.archived = true; }); toast('Archived. Restore it any time from Settings.'); break;
    case 'add': d.kind === 'skill' ? openSkillForm(null) : openHabitForm(null); break;
    case 'edit': d.kind === 'skill' ? openSkillForm(d.id) : openHabitForm(d.id); break;
    case 'del-habit': menuHabit = null; confirmDelete('habit', d.id); break;
    case 'del-skill': menuSkill = null; confirmDelete('skill', d.id); break;
    case 'filter-habit': habitFilter = d.v; render(); break;
    case 'filter-skill': skillFilter = d.v; render(); break;
    case 'skill-menu': menuSkill = menuSkill === d.id ? null : d.id; render(); break;
    case 'practice': { menuSkill = null; const r = mutate(() => G.practiceSkill(S, d.id, today(), Date.now())); toast(r ? `+${r.xp} skill XP${r.left ? '' : ' (daily limit reached)'}` : `Daily practice limit reached (${G.CONST.PRACTICE_PER_DAY}/day)`); break; }
    case 'bonus-open':
      if (d.v === 'license') { view = 'profile'; profileSub = 'license'; render(); $('#scroll').scrollTop = 0; }
      else if (d.v === 'settings') { view = 'settings'; render(); $('#scroll').scrollTop = 0; }
      else if (d.v === 'dailyquest') dqSheet();
      else { bonusSub = d.v === 'credits' ? 'themes' : d.v; render(); }
      break;
    case 'chal-filter': chFilter = d.v; render(); break;
    case 'class-tab': classModal(d.a); break;
    case 'bell': if (S.dailyQuest.state === 'available') showDQ(); else dqSheet(); break;
    case 'dq-sheet': dqSheet(); break;
    case 'dq-respond': closeSheet(); showDQ(); break;
    case 'ob-next': if (ob.step === 'welcome') ob.step = 'create'; else if (ob.step === 'create') ob.step = 'starters'; renderOb(); break;
    case 'ob-back': ob.step = ob.step === 'starters' ? 'create' : 'welcome'; renderOb(); break;
    case 'ob-photo': pickAvatar(renderOb); break;
    case 'ob-starter': ob.starters[Number(d.i)] = !ob.starters[Number(d.i)]; renderOb(); break;
    case 'ob-finish': finishOnboarding(); break;
    case 'bonus-back': bonusSub = null; render(); break;
    case 'ach-filter': achFilter = d.v; render(); break;
    case 'title-filter': titleFilter = d.v; render(); break;
    case 'title-open': titleSheet(d.id); break;
    case 'equip-title': equipTitle(d.id); break;
    case 'theme-open': themeOpen(d.id); break;
    case 'hc-info': hcInfo(); break;
    case 'rank-modal': rankModal(); break;
    case 'class-modal': classModal(d.a); break;
    case 'license-open': profileSub = 'license'; render(); $('#scroll').scrollTop = 0; break;
    case 'license-close': profileSub = null; render(); break;
    case 'card-save': case 'card-share': {
      const cv = $('#card-canvas'); if (!cv) break;
      HA.Card.toBlob(cv).then(b => { const name = `hunters-license-${S.profile.hunterId}.png`; if (act === 'card-save') { HA.Card.download(b, name); toast('License saved as image'); } else return HA.Card.share(b, name).then(r => { if (r === 'downloaded') toast('Sharing is not supported here. Image saved instead.'); }); }).catch(() => toast('Could not create the image'));
      break; }
    case 'avatar': pickAvatar(); break;
    case 'avatar-remove': S.profile.avatar = null; save(); render(); break;
    case 'save-name': { const v = $('#f-name').value.trim(); if (!v) { toast('Name cannot be empty'); break; } S.profile.name = v.slice(0, 24); save(); render(); toast('Name saved'); break; }
    case 'save-life': { S.profile.birthdate = /^\d{4}-\d{2}-\d{2}$/.test($('#f-bd').value) ? $('#f-bd').value : ''; S.profile.lifespan = Math.min(120, Math.max(30, Number($('#f-ls').value) || 80)); save(); render(); toast('Mission Clock saved'); break; }
    case 'sound': S.settings.sound = d.v === '1'; HA.Sound.enabled = S.settings.sound; save(); render(); HA.Sound.play('unlock'); break;
    case 'penalty': S.settings.penalties = d.v === '1'; save(); render(); break;
    case 'dq-open': showDQ(); break;
    case 'dq-mode': { const f = e.target.closest('.dqform'); const tm = f && f.querySelector('.dq-time'); if (tm && tm.value) dqUI.time = tm.value; dqUI.mode = d.v; if (f && f.dataset.w === 'sheet') dqSheet(); else render(); break; }
    case 'dq-save': {
      const f = e.target.closest('.dqform'), v = f.querySelector('.dq-time').value; if (!G.TIME_RE.test(v)) { toast('Pick a valid time'); break; }
      dqUI.time = v;
      if (dqUI.mode === 'every') { G.dqSetRepeat(S, v, Date.now()); toast(`Daily Mission set: every day at ${fmtTime(v)}`); }
      else {
        const [h, m] = v.split(':').map(Number), at = new Date(); at.setHours(h, m, 0, 0);
        if (at.getTime() <= Date.now()) { toast('That time has passed today. Pick a later time or choose Every day.'); break; }
        if (!G.dqCanSchedule(S)) { toast('Finish today’s mission first'); break; }
        S.dailyQuest.repeat = null; G.dqSchedule(S, at.getTime()); toast(`Daily Mission set for ${fmtTime(v)} today`);
      }
      save(); if (f.dataset.w === 'sheet') closeSheet(); render(); break; }
    case 'dq-off': { G.dqStopRepeat(S); dqUI.mode = null; save(); closeSheet(); render(); toast('Daily Mission turned off'); break; }
    case 'week': weekOffset = Math.min(0, weekOffset + Number(d.v)); render(); break;
    case 'day-open': dayModal(d.d); break;
    case 'restore': if (G.activeHabits(S).length >= G.CONST.MAX_ACTIVE_HABITS) { limitNotice(); break; } mutate(() => { const h = S.habits.find(x => x.id === d.id); if (h) h.archived = false; }); toast('Protocol restored with its mastery'); break;
    case 'install': if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.finally(() => { deferredPrompt = null; render(); }); } break;
    case 'update': checkUpdate(); break;
    case 'whatsnew': whatsNew(true); break;
    case 'export': exportEncrypted(); break;
    case 'export-plain': exportData(); break;
    case 'sec-manage': HA.Security.manage(() => render()); break;
    case 'import': importData(); break;
    case 'reset': resetAll(); break;
    case 'sheet-bg': if (e.target === el) closeSheet(); break;
    case 'sheet-close': closeSheet(); break;
    case 'h-icon': syncDraftText(); draft.icon = d.v; renderHabitForm(true); break;
    case 'h-attr': syncDraftText(); draft.attr = d.v; renderHabitForm(true); break;
    case 'h-day': { syncDraftText(); const n = Number(d.v); draft.days = draft.days || []; const i = draft.days.indexOf(n); i >= 0 ? draft.days.splice(i, 1) : draft.days.push(n); renderHabitForm(true); break; }
    case 'h-save': saveHabit(); break;
    case 'h-archive': archiveHabit(); break;
    case 's-attr': syncDraftText(); draft.attr = d.v; renderSkillForm(true); break;
    case 's-icon': syncDraftText(); draft.icon = d.v; renderSkillForm(true); break;
    case 's-save': saveSkill(); break;
  }
});
document.addEventListener('change', (e) => {
  const k = e.target.dataset && e.target.dataset.change; if (!k) return;
  if (k === 'ach-sort') { achSort = e.target.value; render(); }
  else if (k === 'title-cat') { titleCat = e.target.value; render(); }
  else if (k === 'theme') { if (G.THEMES.some(t => t.id === e.target.value)) { S.settings.theme = e.target.value; save(); applyTheme(); render(); } }
  else if (k === 'h-sched') { syncDraftText(); draft.sched = e.target.value; if (draft.sched === 'custom' && !(draft.days && draft.days.length)) draft.days = [new Date().getDay()]; renderHabitForm(true); }
});
document.addEventListener('input', (e) => {
  const k = e.target.dataset && e.target.dataset.input; if (!k) return;
  if (k === 'h-name' || k === 'h-desc') { syncDraftText(); const p = $('#h-preview'); if (p) p.innerHTML = habitPreview(); const a = $('#h-ncnt'), b = $('#h-dcnt'); if (a) a.textContent = `${draft.name.length}/50`; if (b) b.textContent = `${draft.desc.length}/100`; }
  else if (k === 'ob-name') ob.name = e.target.value;
  else if (k === 'ob-bd') ob.bd = e.target.value;
  else if (k === 'ob-ls') ob.ls = e.target.value;
  else if (k === 's-name' || k === 's-desc') { syncDraftText(); const a = $('#s-ncnt'), b = $('#s-dcnt'); if (a) a.textContent = `${draft.name.length}/50`; if (b) b.textContent = `${draft.desc.length}/100`; }
  else if (k === 'title-search') { titleQuery = e.target.value; const l = $('#title-list'); if (l) { const ctx = G.context(S, today()), eq = currentTitle(); let list = G.TITLES.map(t => ({ t, at: S.unlocked.titles[t.id] })); if (titleCat !== 'All') list = list.filter(x => x.t.cat === titleCat); if (titleFilter === 'unlocked') list = list.filter(x => x.at); else if (titleFilter === 'locked') list = list.filter(x => !x.at); else if (titleFilter === 'equipped') list = list.filter(x => eq && x.t.id === eq.id); const q = titleQuery.trim().toLowerCase(); if (q) list = list.filter(x => (x.t.name + ' ' + x.t.desc + ' ' + x.t.cat).toLowerCase().includes(q)); l.innerHTML = titleRows(list, ctx, eq); } }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#layer .sheet') && !HA.Notice.busy) closeSheet(); });

/* ----- drag to reorder ----- */
document.addEventListener('pointerdown', (e) => {
  const grip = e.target.closest('[data-grip]'); if (!grip) return;
  const wrap = grip.closest('[data-row]'), list = wrap.parentElement, kind = wrap.dataset.kind;
  e.preventDefault();
  const rect0 = wrap.getBoundingClientRect(), startY = e.clientY, h = rect0.height;
  wrap.classList.add('dragging'); grip.setPointerCapture(e.pointerId);
  const rows = () => [...list.querySelectorAll(':scope > [data-row]')];
  const move = (ev) => {
    wrap.style.transform = '';
    let nat = wrap.getBoundingClientRect().top, dy = ev.clientY - startY - (nat - rect0.top);
    const center = nat + dy + h / 2, r = rows(), i = r.indexOf(wrap), prev = r[i - 1], next = r[i + 1];
    if (prev && center < prev.getBoundingClientRect().top + h / 2) list.insertBefore(wrap, prev);
    else if (next && center > next.getBoundingClientRect().top + h / 2) list.insertBefore(wrap, next.nextSibling);
    nat = wrap.getBoundingClientRect().top; dy = ev.clientY - startY - (nat - rect0.top); wrap.style.transform = `translateY(${dy}px)`;
  };
  const end = () => {
    grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', end); grip.removeEventListener('pointercancel', end);
    wrap.classList.remove('dragging'); wrap.style.transform = '';
    const order = rows().map(r => r.dataset.id), arr = kind === 'skill' ? S.skills : S.habits;
    const slots = arr.map((x, i) => (order.includes(x.id) ? i : -1)).filter(i => i >= 0), byId = Object.fromEntries(arr.map(x => [x.id, x]));
    order.forEach((id, n) => { arr[slots[n]] = byId[id]; });
    save(); render();
  };
  grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
});

/* ----- clock tick, day rollover, daily quest ----- */
function rollover() {
  curDay = today(); const r = G.processDays(S, curDay); G.refreshDay(S, curDay); save(); render(); reportEvents(r.events);
}
setInterval(() => {
  if (today() !== curDay) { rollover(); return; }
  tickLife(); const cbc = $('#cb-clock'); if (cbc) cbc.textContent = zulu();
  const dqBefore = JSON.stringify(S.dailyQuest);
  if (G.dqTick(S, Date.now())) { save(); render(); showDQ(); } else if (JSON.stringify(S.dailyQuest) !== dqBefore) { save(); render(); }
}, 1000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (today() !== curDay) rollover();
  if (swReg) swReg.update().catch(() => {});
});

/* ============================== PWA: install + updates ============================== */
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; if (view === 'settings') render(); });
window.addEventListener('appinstalled', () => { deferredPrompt = null; if (view === 'settings') render(); });
function checkUpdate() {
  if (!swReg) { toast('Offline mode is not supported in this browser.'); return; }
  toast('Checking for updates…');
  swReg.update().then(() => setTimeout(() => { if (!swReg.installing && !swReg.waiting) toast('You are on the latest version.'); }, 1500)).catch(() => toast('Could not check. Are you offline?'));
}
if ('serviceWorker' in navigator) {
  let hadController = !!navigator.serviceWorker.controller, reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; }
    if (reloading) return; reloading = true;
    const b = document.createElement('div'); b.className = 'update-banner'; b.setAttribute('role', 'status'); b.textContent = 'Updating to the latest version…';
    document.body.appendChild(b); setTimeout(() => location.reload(), 600);
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => { swReg = reg; reg.update().catch(() => {}); }).catch((err) => console.warn('Service worker failed', err));
  });
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

/* ============================== boot ============================== */
applyTheme();
const boot = G.processDays(S, today());
G.dqTick(S, Date.now());
G.refreshDay(S, today());
G.checkUnlocks(S, today());
save(); render();
if (!S.meta.onboarded) openOnboarding();
else {
  if (S.meta.lastSeenVersion !== window.APP_VERSION) { S.meta.lastSeenVersion = window.APP_VERSION; save(); setTimeout(() => whatsNew(false), 600); }
  setTimeout(() => reportEvents(boot.events), 900);
  if (S.dailyQuest.state === 'available') dqTimer = setTimeout(showDQ, G.CONST.DAILY_QUEST_REOPEN_DELAY_MS);   // missed schedule: show ~2s after opening
}
window.__HA = { get state() { return S; }, set state(v) { S = v; }, render, save, showDQ };
})();
