/* HunterArsenal local data layer (localStorage).
 * Everything read from disk or from an imported backup is treated as untrusted:
 * sanitize() whitelists fields, clamps numbers and lengths, and rejects unknown ids.
 * NOTE: this is local-only storage, so a determined user can still edit their own device data.
 * Real anti-tamper needs the server-side validation described in the spec (future Supabase sync). */
(function (g) {
  'use strict';
  const HA = (g.HA = g.HA || {});
  const G = HA.Game;
  const KEY = 'hunterarsenal.v3';
  const LEGACY_KEYS = ['hunterarsenal.v2'];            // older builds: migrated (and re-validated) on first load
  let recovery = null;
  let lastKnownRaw = null;

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const ID_RE = /^[A-Za-z0-9_-]{1,32}$/;
  const ICON_RE = /^[a-z0-9]{2,16}$/;
  const clamp = (n, lo, hi, d = lo) => { n = Number(n); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
  const str = (s, max, d = '') => (typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : d);
  const obj = o => (o && typeof o === 'object' && !Array.isArray(o) ? o : {});
  const arr = a => (Array.isArray(a) ? a : []);

  function makeHunterId() {
    const cs = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', out = [];
    const buf = new Uint8Array(8);
    (g.crypto || g.msCrypto).getRandomValues(buf);
    buf.forEach(b => out.push(cs[b % cs.length]));
    return `HA-${out.slice(0, 4).join('')}-${out.slice(4).join('')}`;
  }
  const uid = () => {
    const b = new Uint8Array(6); g.crypto.getRandomValues(b);
    return Array.from(b, x => x.toString(36).padStart(2, '0')).join('').slice(0, 10) + Date.now().toString(36).slice(-3);
  };

  function defaults() {
    const now = Date.now(), today = G.todayKey();
    return {
      v: 4,
      profile: { name: 'Hunter', avatar: null, hunterId: makeHunterId(), createdAt: now, equippedTitle: null, birthdate: '', lifespan: 80 },
      settings: { theme: 'default', sound: false, penalties: true, autoFreeze: true, shopTab: 'Display Modes', border: 'none', namePlate: 'none' },
      habits: [], skills: [], skillLog: [], completions: {}, days: {},
      streak: { combo: 0, best: 0, freezes: 0, milestones: [], processed: G.addDays(today, -1) },
      unlocked: { achievements: {}, titles: {}, challenges: {} },
      purchases: [], dailyQuest: { state: 'none', at: null, day: null, completed: 0, repeat: null },
      meta: { lastSeenVersion: null, lastAcknowledgedWhatsNewVersion: null, onboarded: false, rulesSeen: false, rulesVersion: null }
    };
  }

  function normalize(raw) {
    const base = defaults(), r = obj(raw), p = obj(r.profile), s = obj(r.settings);
    const out = base;
    out.profile.name = str(p.name, 24, 'Hunter') || 'Hunter';
    out.profile.avatar = typeof p.avatar === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.avatar) && p.avatar.length < 450000 ? p.avatar : null;
    out.profile.hunterId = typeof p.hunterId === 'string' && /^HA-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(p.hunterId) ? p.hunterId : base.profile.hunterId;
    out.profile.createdAt = clamp(p.createdAt, 946684800000, Date.now() + 864e5, base.profile.createdAt);
    out.profile.equippedTitle = G.TITLES.some(t => t.id === p.equippedTitle) ? p.equippedTitle : null;
    out.profile.birthdate = DATE_RE.test(p.birthdate || '') ? p.birthdate : '';
    out.profile.lifespan = Math.round(clamp(p.lifespan, 30, 120, 80));
    out.settings.theme = G.THEMES.some(t => t.id === s.theme) ? s.theme : 'default';
    out.settings.sound = s.sound === true;
    out.settings.penalties = typeof s.penalties === 'boolean' ? s.penalties : true;
    out.settings.autoFreeze = s.autoFreeze !== false;
    out.settings.shopTab = ['Display Modes', 'Photo Borders', 'Name Plates'].includes(s.shopTab) ? s.shopTab : 'Display Modes';
    out.settings.border = G.COSMETICS.some(c => c.type === 'border' && c.id === s.border) ? s.border : 'none';
    out.settings.namePlate = G.COSMETICS.some(c => c.type === 'plate' && c.id === s.namePlate) ? s.namePlate : 'none';

    const seen = new Set();
    out.habits = arr(r.habits).map(h => {
      h = obj(h);
      if (!ID_RE.test(h.id || '') || seen.has(h.id)) return null; seen.add(h.id);
      let days = null;
      if (Array.isArray(h.days)) { days = [...new Set(h.days.map(Number).filter(n => n >= 0 && n <= 6))]; if (days.length === 0 || days.length === 7) days = days.length === 7 ? null : [0]; }
      return {
        id: h.id, name: str(h.name, 50) || 'Habit', desc: str(h.desc, 100),
        icon: ICON_RE.test(h.icon || '') ? h.icon : 'target',
        attr: G.ATTRS[h.attr] ? h.attr : 'STR',
        days, created: DATE_RE.test(h.created || '') ? h.created : G.todayKey(), archived: h.archived === true
      };
    }).filter(Boolean);
    const sk = new Set();
    out.skills = arr(r.skills).map(x => {
      x = obj(x); if (!ID_RE.test(x.id || '') || sk.has(x.id)) return null; sk.add(x.id);
      return { id: x.id, name: str(x.name, 50) || 'Skill', desc: str(x.desc, 100), icon: ICON_RE.test(x.icon || '') ? x.icon : 'book', attr: G.ATTRS[x.attr] ? x.attr : 'INT', created: DATE_RE.test(x.created || '') ? x.created : G.todayKey() };
    }).filter(Boolean);
    out.skillLog = arr(r.skillLog).map(e => { e = obj(e); return sk.has(e.id) && DATE_RE.test(e.d || '') ? { id: e.id, d: e.d, xp: Number(e.xp), at: clamp(e.at, 0, 4e12, 0) } : null; }).filter(Boolean);

    const comps = obj(r.completions);
    for (const d of Object.keys(comps)) {
      if (!DATE_RE.test(d)) continue;
      const day = {};
      for (const id of Object.keys(obj(comps[d]))) {
        if (!ID_RE.test(id)) continue;
        const c = obj(comps[d][id]);
        // XP values are canonical: whatever a file claims, a check-in is always worth the fixed amounts.
        day[id] = { xp: G.CONST.HUNTER_XP, ax: G.CONST.ATTR_XP, mx: G.CONST.MASTERY_XP, attr: G.ATTRS[c.attr] ? c.attr : 'STR', at: clamp(c.at, 0, 4e12, 0) };
      }
      out.completions[d] = day;
    }
    const days = obj(r.days);
    for (const d of Object.keys(days)) {
      if (!DATE_RE.test(d)) continue; const x = obj(days[d]);
      out.days[d] = { sched: Math.round(clamp(x.sched, 0, 200, 0)), done: Math.round(clamp(x.done, 0, 200, 0)), perfect: x.perfect === true, penalty: Math.round(clamp(x.penalty, 0, 100000, 0)), habitPenalty: Math.round(clamp(x.habitPenalty, 0, 100000, 0)), dqPenalty: Math.round(clamp(x.dqPenalty, 0, 1000, 0)), dq: x.dq > 0 ? G.CONST.DAILY_QUEST_BONUS : 0, frozen: x.frozen === true, restDay: x.restDay === true };
    }
    const st = obj(r.streak);
    const legacyBest = Math.round(clamp(st.best, 0, 5000, 0));
    const freezeMilestones = arr(st.milestones).map(Number).filter(n => [3, 7, 30].includes(n));
    if (Number(r.v) < 4) [3, 7, 30].forEach(n => { if (Math.round(clamp(st.combo, 0, 5000, 0)) >= n && !freezeMilestones.includes(n)) freezeMilestones.push(n); });
    out.streak = { combo: Math.round(clamp(st.combo, 0, 5000, 0)), best: legacyBest, freezes: Math.round(clamp(st.freezes, 0, G.CONST.FREEZE_CAP, 0)), milestones: freezeMilestones, processed: DATE_RE.test(st.processed || '') ? st.processed : base.streak.processed };
    if (out.streak.processed > G.todayKey()) out.streak.processed = G.addDays(G.todayKey(), -1);
    const un = obj(r.unlocked);
    G.ACHIEVEMENTS.forEach(a => { const t = obj(un.achievements)[a.id]; if (t !== undefined) out.unlocked.achievements[a.id] = clamp(t, 0, 4e12, Date.now()); });
    G.TITLES.forEach(a => { const t = obj(un.titles)[a.id]; if (t !== undefined) out.unlocked.titles[a.id] = clamp(t, 0, 4e12, Date.now()); });
    G.CHALLENGES.forEach(a => { const t = obj(un.challenges)[a.id]; if (t !== undefined) out.unlocked.challenges[a.id] = clamp(t, 0, 4e12, Date.now()); });
    out.purchases = arr(r.purchases).map(p => { p = obj(p); const th = G.THEMES.find(t => t.id === p.id), cosmetic = G.COSMETICS.find(c => c.id === p.id); if (th && th.unlock.type === 'hc') return { id: th.id, cost: th.unlock.value, at: clamp(p.at, 0, 4e12, 0) }; if (cosmetic) return { id: cosmetic.id, cost: cosmetic.cost, at: clamp(p.at, 0, 4e12, 0) }; return null; }).filter(Boolean);
    const dq = obj(r.dailyQuest), states = ['none', 'scheduled', 'available', 'accepted', 'completed', 'failed', 'declined'];
    out.dailyQuest = { state: states.includes(dq.state) ? dq.state : 'none', at: dq.at === null || dq.at === undefined ? null : clamp(dq.at, 0, 4e12, null), day: DATE_RE.test(dq.day || '') ? dq.day : null, completed: Math.round(clamp(dq.completed, 0, 100000, 0)), repeat: /^([01]\d|2[0-3]):[0-5]\d$/.test(dq.repeat || '') ? dq.repeat : null };
    const m = obj(r.meta);
    out.meta = { lastSeenVersion: m.lastSeenVersion == null ? null : str(m.lastSeenVersion, 16, ''), lastAcknowledgedWhatsNewVersion: m.lastAcknowledgedWhatsNewVersion == null ? null : str(m.lastAcknowledgedWhatsNewVersion, 16, ''), onboarded: m.onboarded === true, rulesSeen: m.rulesSeen === true, rulesVersion: m.rulesVersion == null ? null : str(m.rulesVersion, 16, '') };
    return out;
  }

  const plain = x => !!x && typeof x === 'object' && !Array.isArray(x) && (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null);
  const mapShape = x => x === undefined || plain(x);
  function onlyKeys(value, allowed, label) {
    if (plain(value)) for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`${label} contains an unsupported field (${key}); its data was not discarded.`);
  }
  function validateInput(raw, opts = {}) {
    if (!plain(raw)) throw new Error('The saved record is not an object.');
    onlyKeys(raw, ['v','profile','settings','habits','skills','skillLog','completions','days','streak','unlocked','purchases','dailyQuest','meta'], 'Saved record');
    if (!opts.allowMissingVersion && !Number.isInteger(raw.v)) throw new Error('The saved record has no valid schema version.');
    if (raw.v !== undefined && (!Number.isInteger(raw.v) || raw.v < 1 || raw.v > 4)) throw new Error('The saved record uses an unsupported schema version.');
    const requireLegacy = !!opts.requireLegacyBackup || (raw.v === undefined ? !!opts.allowMissingVersion : raw.v < 4);
    if (!Array.isArray(raw.habits)) throw new Error('The saved record is missing its Habits list.');
    for (const k of ['skills', 'skillLog', 'purchases']) if (raw[k] !== undefined && !Array.isArray(raw[k])) throw new Error(`The saved ${k} data is invalid.`);
    for (const k of ['profile', 'settings', 'completions', 'days', 'streak', 'unlocked', 'dailyQuest', 'meta']) {
      if (!mapShape(raw[k])) throw new Error(`The saved ${k} data is invalid.`);
    }
    if (requireLegacy && (!plain(raw.profile) || !plain(raw.settings) || !Array.isArray(raw.skills) || !Array.isArray(raw.skillLog) ||
        !plain(raw.completions) || !plain(raw.days) || !plain(raw.streak) || !plain(raw.unlocked) || !Array.isArray(raw.purchases) ||
        !plain(raw.dailyQuest) || !plain(raw.meta))) throw new Error('The backup is missing required data sections.');
    if (requireLegacy) {
      const p = raw.profile;
      if (!Object.prototype.hasOwnProperty.call(p, 'name') || !Object.prototype.hasOwnProperty.call(p, 'hunterId') ||
          !Object.prototype.hasOwnProperty.call(p, 'createdAt') || !Object.prototype.hasOwnProperty.call(p, 'lifespan') ||
          typeof p.name !== 'string' || !p.name.trim() || p.name.trim() !== p.name || p.name.length > 24 ||
          !/^HA-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(p.hunterId) || !Number.isFinite(p.createdAt) ||
          !Number.isInteger(p.lifespan) || p.lifespan < 30 || p.lifespan > 120) throw new Error('The legacy Profile cannot be migrated without replacing user data.');
      if (!['name','avatar','hunterId','createdAt','equippedTitle','birthdate','lifespan'].every(k => Object.prototype.hasOwnProperty.call(p, k)) ||
          !['theme','sound','penalties'].every(k => Object.prototype.hasOwnProperty.call(raw.settings, k)) ||
          !['combo','best','freezes','processed'].every(k => Object.prototype.hasOwnProperty.call(raw.streak, k)) ||
          !['state','at','day','completed','repeat'].every(k => Object.prototype.hasOwnProperty.call(raw.dailyQuest, k)) ||
          !['lastSeenVersion','onboarded'].every(k => Object.prototype.hasOwnProperty.call(raw.meta, k)) ||
          !['achievements','titles','challenges'].every(k => plain(raw.unlocked[k]))) {
        throw new Error('The legacy record is missing persisted fields required for a safe migration.');
      }
      if (Number(raw.v) === 3 && (!['avatar','equippedTitle','birthdate'].every(k => Object.prototype.hasOwnProperty.call(p, k)) ||
          !['theme','sound','penalties'].every(k => Object.prototype.hasOwnProperty.call(raw.settings, k)) ||
          !['combo','best','freezes','processed'].every(k => Object.prototype.hasOwnProperty.call(raw.streak, k)) ||
          !['state','at','day','completed','repeat'].every(k => Object.prototype.hasOwnProperty.call(raw.dailyQuest, k)) ||
          !['lastSeenVersion','onboarded'].every(k => Object.prototype.hasOwnProperty.call(raw.meta, k)) ||
          !plain(raw.unlocked.achievements) || !plain(raw.unlocked.titles) || !plain(raw.unlocked.challenges))) {
        throw new Error('The schema v3 record is missing required Profile or Settings fields.');
      }
    }
    if (plain(raw.profile)) {
      const p = raw.profile;
      onlyKeys(p, ['name','avatar','hunterId','createdAt','equippedTitle','birthdate','lifespan'], 'Profile');
      if (typeof p.name !== 'string' || !p.name.trim() || p.name.trim() !== p.name || p.name.length > 24 || /[\u0000-\u001f\u007f]/.test(p.name) ||
          !/^HA-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(p.hunterId || '') || !Number.isFinite(p.createdAt) || p.createdAt < 946684800000 || p.createdAt > Date.now() + 864e5 ||
          (p.avatar !== undefined && !(p.avatar === null || (typeof p.avatar === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.avatar) && p.avatar.length < 450000))) ||
          (p.equippedTitle !== undefined && !(p.equippedTitle === null || G.TITLES.some(t => t.id === p.equippedTitle))) ||
          (p.birthdate !== undefined && !(p.birthdate === '' || DATE_RE.test(p.birthdate))) || !Number.isInteger(p.lifespan) || p.lifespan < 30 || p.lifespan > 120) {
        throw new Error('A saved Profile would require lossy normalization.');
      }
    }
    if (plain(raw.settings)) {
      const s = raw.settings;
      onlyKeys(s, ['theme','sound','penalties','autoFreeze','shopTab','border','namePlate'], 'Settings');
      if ((s.theme !== undefined && !G.THEMES.some(t => t.id === s.theme)) ||
          (s.sound !== undefined && typeof s.sound !== 'boolean') || (s.penalties !== undefined && typeof s.penalties !== 'boolean') ||
          (s.autoFreeze !== undefined && typeof s.autoFreeze !== 'boolean') ||
          (s.shopTab !== undefined && !['Display Modes', 'Photo Borders', 'Name Plates'].includes(s.shopTab)) ||
          (s.border !== undefined && !(s.border === 'none' || G.COSMETICS.some(c => c.type === 'border' && c.id === s.border))) ||
          (s.namePlate !== undefined && !(s.namePlate === 'none' || G.COSMETICS.some(c => c.type === 'plate' && c.id === s.namePlate)))) {
        throw new Error('Saved Settings would require lossy normalization.');
      }
    }
    if (opts.requireCurrent) {
      if (raw.v !== 4 || !plain(raw.profile) || !plain(raw.settings) || !Array.isArray(raw.skills) || !Array.isArray(raw.skillLog) ||
          !plain(raw.completions) || !plain(raw.days) || !plain(raw.streak) || !plain(raw.unlocked) || !Array.isArray(raw.purchases) ||
          !plain(raw.dailyQuest) || !plain(raw.meta)) throw new Error('The candidate does not match the current storage schema.');
      const has = (o, keys) => keys.every(k => Object.prototype.hasOwnProperty.call(o, k));
      const typed = (o, spec) => Object.entries(spec).every(([k, type]) => type(o[k]));
      const string = x => typeof x === 'string', number = x => typeof x === 'number' && Number.isFinite(x), bool = x => typeof x === 'boolean';
      const inRange = (x, lo, hi) => number(x) && x >= lo && x <= hi;
      if (!has(raw.profile, ['name','avatar','hunterId','createdAt','equippedTitle','birthdate','lifespan']) ||
          !typed(raw.profile, { name: string, hunterId: string, createdAt: number, birthdate: string, lifespan: number }) ||
          !(raw.profile.avatar === null || string(raw.profile.avatar)) || !(raw.profile.equippedTitle === null || string(raw.profile.equippedTitle))) throw new Error('The saved Profile fields are incomplete.');
      if (!raw.profile.name.trim() || raw.profile.name.length > 24 || !/^HA-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(raw.profile.hunterId) ||
          !inRange(raw.profile.createdAt, 946684800000, Date.now() + 864e5) || !Number.isInteger(raw.profile.lifespan) || raw.profile.lifespan < 30 || raw.profile.lifespan > 120 ||
          !(raw.profile.equippedTitle === null || G.TITLES.some(t => t.id === raw.profile.equippedTitle)) ||
          !(raw.profile.birthdate === '' || DATE_RE.test(raw.profile.birthdate)) ||
          !(raw.profile.avatar === null || (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(raw.profile.avatar) && raw.profile.avatar.length < 450000))) throw new Error('The saved Profile values are invalid.');
      if (!has(raw.settings, ['theme','sound','penalties','autoFreeze','shopTab','border','namePlate']) ||
          !typed(raw.settings, { theme: string, sound: bool, penalties: bool, autoFreeze: bool, shopTab: string, border: string, namePlate: string })) throw new Error('The saved Settings fields are incomplete.');
      if (!G.THEMES.some(t => t.id === raw.settings.theme) || !['Display Modes','Photo Borders','Name Plates'].includes(raw.settings.shopTab) ||
          !(raw.settings.border === 'none' || G.COSMETICS.some(c => c.type === 'border' && c.id === raw.settings.border)) ||
          !(raw.settings.namePlate === 'none' || G.COSMETICS.some(c => c.type === 'plate' && c.id === raw.settings.namePlate))) throw new Error('The saved Appearance settings are invalid.');
      if (!has(raw.streak, ['combo','best','freezes','milestones','processed']) ||
          !typed(raw.streak, { combo: number, best: number, freezes: number, processed: string }) || !Array.isArray(raw.streak.milestones)) throw new Error('The saved Streak fields are incomplete.');
      if (!Number.isInteger(raw.streak.combo) || raw.streak.combo < 0 || raw.streak.combo > 5000 || !Number.isInteger(raw.streak.best) || raw.streak.best < 0 || raw.streak.best > 5000 ||
          !Number.isInteger(raw.streak.freezes) || raw.streak.freezes < 0 || raw.streak.freezes > G.CONST.FREEZE_CAP || !DATE_RE.test(raw.streak.processed) ||
          raw.streak.milestones.some(n => ![3, 7, 30].includes(n))) throw new Error('The saved Streak values are invalid.');
      if (!has(raw.unlocked, ['achievements','titles','challenges']) || !plain(raw.unlocked.achievements) || !plain(raw.unlocked.titles) || !plain(raw.unlocked.challenges)) throw new Error('The saved unlock records are incomplete.');
      if (!has(raw.dailyQuest, ['state','at','day','completed','repeat']) || !string(raw.dailyQuest.state) || !number(raw.dailyQuest.completed)) throw new Error('The saved Daily Mission fields are incomplete.');
      if (!['none','scheduled','available','accepted','completed','failed','declined'].includes(raw.dailyQuest.state) ||
          !(raw.dailyQuest.at === null || inRange(raw.dailyQuest.at, 0, 4e12)) || !Number.isInteger(raw.dailyQuest.completed) || raw.dailyQuest.completed < 0 || raw.dailyQuest.completed > 100000 ||
          !(raw.dailyQuest.day === null || (string(raw.dailyQuest.day) && DATE_RE.test(raw.dailyQuest.day))) ||
          !(raw.dailyQuest.repeat === null || /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.dailyQuest.repeat))) throw new Error('The saved Daily Mission values are invalid.');
      if (!has(raw.meta, ['lastSeenVersion','lastAcknowledgedWhatsNewVersion','onboarded','rulesSeen','rulesVersion']) ||
          !typed(raw.meta, { onboarded: bool, rulesSeen: bool }) || ![raw.meta.lastSeenVersion, raw.meta.lastAcknowledgedWhatsNewVersion, raw.meta.rulesVersion].every(x => x === null || string(x))) throw new Error('The saved system metadata is incomplete.');
      for (const group of [raw.unlocked.achievements, raw.unlocked.titles, raw.unlocked.challenges]) for (const value of Object.values(group)) if (!inRange(value, 0, 4e12)) throw new Error('A saved unlock record is invalid.');
      for (const h of raw.habits) if (!string(h.name) || !h.name.trim() || h.name.length > 50 || !string(h.desc) || h.desc.length > 100 || !/^[a-z0-9]{2,16}$/.test(h.icon) || !G.ATTRS[h.attr] || !DATE_RE.test(h.created) || !bool(h.archived) ||
          !(h.days === null || (Array.isArray(h.days) && h.days.every(d => Number.isInteger(d) && d >= 0 && d <= 6)))) throw new Error('A current Habit record is incomplete.');
      for (const s of raw.skills) if (!string(s.name) || !s.name.trim() || s.name.length > 50 || !string(s.desc) || s.desc.length > 100 || !/^[a-z0-9]{2,16}$/.test(s.icon) || !G.ATTRS[s.attr] || !DATE_RE.test(s.created)) throw new Error('A current Skill record is incomplete.');
      for (const entry of raw.skillLog) if (!number(entry.xp) || entry.xp !== G.CONST.PRACTICE_XP || !inRange(entry.at, 0, 4e12)) throw new Error('A current Skill history record is incomplete or has non-canonical earned XP.');
      for (const entries of Object.values(raw.completions)) for (const entry of Object.values(entries)) {
        if (!has(entry, ['xp','ax','mx','attr','at']) || entry.xp !== G.CONST.HUNTER_XP || entry.ax !== G.CONST.ATTR_XP || entry.mx !== G.CONST.MASTERY_XP || !G.ATTRS[entry.attr] || !inRange(entry.at, 0, 4e12)) throw new Error('A current Habit completion is incomplete.');
      }
      for (const entry of Object.values(raw.days)) if (!has(entry, ['sched','done','perfect']) ||
          !inRange(entry.sched, 0, 200) || !inRange(entry.done, 0, 200) || !bool(entry.perfect) ||
          !(entry.penalty === undefined || inRange(entry.penalty, 0, 100000)) || !(entry.habitPenalty === undefined || inRange(entry.habitPenalty, 0, 100000)) ||
          !(entry.dqPenalty === undefined || inRange(entry.dqPenalty, 0, 1000)) || !(entry.dq === undefined || entry.dq === 0 || entry.dq === G.CONST.DAILY_QUEST_BONUS) ||
          !(entry.frozen === undefined || bool(entry.frozen)) || !(entry.restDay === undefined || bool(entry.restDay))) throw new Error('A current daily record is incomplete.');
      for (const p of raw.purchases) {
        const item = plain(p) && (G.THEMES.find(t => t.id === p.id && t.unlock.type === 'hc') || G.COSMETICS.find(c => c.id === p.id));
        if (!item || p.cost !== (item.unlock ? item.unlock.value : item.cost) || !inRange(p.at, 0, 4e12)) throw new Error('A current Hunter Credit purchase record is invalid.');
      }
    }
    const ids = new Set(); let activeCount = 0;
    for (const h of raw.habits) {
      onlyKeys(h, ['id','name','desc','icon','attr','days','created','archived'], 'Habit');
      if (!plain(h) || !ID_RE.test(h.id || '') || ids.has(h.id)) throw new Error('A saved Habit record is invalid.');
      ids.add(h.id);
      if (!stringOrUndefined(h.name) || !stringOrUndefined(h.desc) || !stringOrUndefined(h.icon) || !stringOrUndefined(h.attr) ||
          !(h.days === undefined || h.days === null || Array.isArray(h.days)) || !stringOrUndefined(h.created) || !boolOrUndefined(h.archived)) throw new Error('A saved Habit record has invalid fields.');
      if (typeof h.name !== 'string' || !h.name.trim() || h.name.trim() !== h.name || h.name.length > 50 || /[\u0000-\u001f\u007f]/.test(h.name) ||
          (h.desc !== undefined && (typeof h.desc !== 'string' || h.desc.length > 100 || h.desc.trim() !== h.desc || /[\u0000-\u001f\u007f]/.test(h.desc))) ||
          !G.ATTRS[h.attr] || !DATE_RE.test(h.created || '') ||
          (h.icon !== undefined && !ICON_RE.test(h.icon)) || (h.archived !== true && h.archived !== false && h.archived !== undefined) ||
          (Array.isArray(h.days) && (!h.days.length || h.days.some(d => !Number.isInteger(d) || d < 0 || d > 6) || new Set(h.days).size !== h.days.length))) {
        throw new Error('A saved Habit would require lossy normalization.');
      }
      if (h.archived !== true && ++activeCount > G.CONST.MAX_ACTIVE_HABITS) throw new Error('The saved record exceeds the supported active Habit limit; no Habits were archived automatically.');
    }
    const skillIds = new Set();
    for (const item of raw.skills || []) {
      onlyKeys(item, ['id','name','desc','icon','attr','created'], 'Skill');
      if (!plain(item) || !ID_RE.test(item.id || '') || skillIds.has(item.id)) throw new Error('A saved Skill record is invalid.');
      skillIds.add(item.id);
      if (!stringOrUndefined(item.name) || !stringOrUndefined(item.desc) || !stringOrUndefined(item.icon) || !stringOrUndefined(item.attr) || !stringOrUndefined(item.created)) throw new Error('A saved Skill record has invalid fields.');
      if (typeof item.name !== 'string' || !item.name.trim() || item.name.trim() !== item.name || item.name.length > 50 || /[\u0000-\u001f\u007f]/.test(item.name) ||
          (item.desc !== undefined && (typeof item.desc !== 'string' || item.desc.length > 100 || item.desc.trim() !== item.desc || /[\u0000-\u001f\u007f]/.test(item.desc))) ||
          !G.ATTRS[item.attr] || !DATE_RE.test(item.created || '') || (item.icon !== undefined && !ICON_RE.test(item.icon))) {
        throw new Error('A saved Skill would require lossy normalization.');
      }
    }
    for (const entry of raw.skillLog || []) {
      onlyKeys(entry, ['id','d','xp','at'], 'Skill history');
      if (!plain(entry) || !ID_RE.test(entry.id || '') || !skillIds.has(entry.id) || !DATE_RE.test(entry.d || '') ||
          typeof entry.xp !== 'number' || !Number.isFinite(entry.xp) || entry.xp < 0 || !Number.isFinite(entry.at) || entry.at < 0 || entry.at > 4e12) throw new Error('A saved Skill history record is invalid or would be discarded.');
      if (entry.xp !== G.CONST.PRACTICE_XP) throw new Error('A Skill history record cannot be migrated without changing its earned XP.');
    }
    for (const [date, entries] of Object.entries(raw.completions || {})) {
      if (!DATE_RE.test(date) || !plain(entries)) throw new Error('Saved Habit completion history is invalid.');
      for (const [id, entry] of Object.entries(entries)) {
        onlyKeys(entry, ['xp','ax','mx','attr','at','base'], 'Habit completion');
        if (!ID_RE.test(id) || !plain(entry) || !G.ATTRS[entry.attr] || !Number.isFinite(entry.at) || entry.at < 0 || entry.at > 4e12) throw new Error('A saved Habit completion is invalid.');
        if (raw.v === undefined && entry.xp === undefined && entry.base === undefined) throw new Error('A legacy completion has no saved reward value to migrate.');
        if (Number(raw.v) >= 3 && (entry.xp !== G.CONST.HUNTER_XP || entry.ax !== G.CONST.ATTR_XP || entry.mx !== G.CONST.MASTERY_XP)) throw new Error('A legacy completion cannot be migrated without changing its earned XP.');
        if (raw.v === undefined && ((entry.xp !== undefined && entry.xp !== G.CONST.HUNTER_XP) || (entry.base !== undefined && entry.base !== G.CONST.HUNTER_XP) ||
            (entry.ax !== undefined && entry.ax !== G.CONST.ATTR_XP) || (entry.mx !== undefined && entry.mx !== G.CONST.MASTERY_XP))) throw new Error('A legacy completion cannot be migrated without changing its earned XP.');
      }
    }
    for (const [date, entry] of Object.entries(raw.days || {})) {
      onlyKeys(entry, ['sched','done','perfect','penalty','habitPenalty','dqPenalty','dq','frozen','restDay'], 'Daily record');
      if (!DATE_RE.test(date) || !plain(entry)) throw new Error('A saved daily record is invalid.');
      if (!['sched','done','perfect'].every(k => Object.prototype.hasOwnProperty.call(entry, k))) throw new Error('A persisted daily record is incomplete.');
      for (const [key, max] of [['sched', 200], ['done', 200], ['penalty', 100000], ['habitPenalty', 100000], ['dqPenalty', 1000]]) {
        if (entry[key] !== undefined && (!Number.isInteger(entry[key]) || entry[key] < 0 || entry[key] > max)) throw new Error('A saved daily record would require lossy normalization.');
      }
      if (entry.dq !== undefined && entry.dq !== 0 && entry.dq !== G.CONST.DAILY_QUEST_BONUS) throw new Error('A saved Daily Mission reward would require lossy normalization.');
      for (const key of ['perfect', 'frozen', 'restDay']) if (entry[key] !== undefined && typeof entry[key] !== 'boolean') throw new Error('A saved daily record would require lossy normalization.');
    }
    if (plain(raw.streak)) {
      const st = raw.streak;
      onlyKeys(st, ['combo','best','freezes','milestones','processed'], 'Streak');
      for (const [key, max] of [['combo', 5000], ['best', 5000], ['freezes', G.CONST.FREEZE_CAP]]) if (st[key] !== undefined && (!Number.isInteger(st[key]) || st[key] < 0 || st[key] > max)) throw new Error('Saved Streak data would require lossy normalization.');
      if (st.processed !== undefined && (!DATE_RE.test(st.processed) || st.processed > G.todayKey())) throw new Error('Saved Streak date would require lossy normalization.');
      if (st.milestones !== undefined && (!Array.isArray(st.milestones) || st.milestones.some(n => ![3, 7, 30].includes(n)))) throw new Error('Saved Streak milestones are invalid.');
    }
    if (plain(raw.dailyQuest)) {
      const dq = raw.dailyQuest;
      onlyKeys(dq, ['state','at','day','completed','repeat'], 'Daily Mission');
      if (dq.state !== undefined && !['none', 'scheduled', 'available', 'accepted', 'completed', 'failed', 'declined'].includes(dq.state) ||
          (dq.at !== undefined && dq.at !== null && (!Number.isFinite(dq.at) || dq.at < 0 || dq.at > 4e12)) ||
          (dq.day !== undefined && dq.day !== null && !DATE_RE.test(dq.day)) ||
          (dq.completed !== undefined && (!Number.isInteger(dq.completed) || dq.completed < 0 || dq.completed > 100000)) ||
          (dq.repeat !== undefined && dq.repeat !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(dq.repeat))) throw new Error('Saved Daily Mission data would require lossy normalization.');
    }
    const validGroups = { achievements: new Set(G.ACHIEVEMENTS.map(x => x.id)), titles: new Set(G.TITLES.map(x => x.id)), challenges: new Set(G.CHALLENGES.map(x => x.id)) };
    for (const [groupName, group] of Object.entries(obj(raw.unlocked))) for (const [id, value] of Object.entries(obj(group))) {
      if (!validGroups[groupName]?.has(id) || !Number.isFinite(value) || value < 0 || value > 4e12) throw new Error('A saved unlock would be discarded during normalization.');
    }
    onlyKeys(raw.unlocked, ['achievements','titles','challenges'], 'Unlock record');
    for (const purchase of raw.purchases || []) onlyKeys(purchase, ['id','cost','at'], 'Purchase');
    if (plain(raw.meta)) {
      onlyKeys(raw.meta, ['lastSeenVersion','lastAcknowledgedWhatsNewVersion','onboarded','rulesSeen','rulesVersion'], 'System metadata');
      for (const key of ['lastSeenVersion','lastAcknowledgedWhatsNewVersion','rulesVersion']) {
        const value = raw.meta[key];
        if (value !== undefined && value !== null && (typeof value !== 'string' || value.trim() !== value || value.length > 16 || /[\u0000-\u001f\u007f]/.test(value))) throw new Error('System metadata would require lossy normalization.');
      }
      for (const key of ['onboarded','rulesSeen']) if (raw.meta[key] !== undefined && typeof raw.meta[key] !== 'boolean') throw new Error('System metadata contains an invalid flag.');
    }
    for (const purchase of raw.purchases || []) {
      const item = plain(purchase) && (G.THEMES.find(t => t.id === purchase.id && t.unlock.type === 'hc') || G.COSMETICS.find(c => c.id === purchase.id));
      const cost = item && (item.unlock ? item.unlock.value : item.cost);
      if (!item || !Number.isFinite(purchase.at) || purchase.at < 0 || purchase.at > 4e12 || purchase.cost !== cost) throw new Error('A saved purchase would be discarded or rewritten during normalization.');
    }
    return true;
  }
  const stringOrUndefined = x => x === undefined || typeof x === 'string';
  const boolOrUndefined = x => x === undefined || typeof x === 'boolean';
  function validState(raw, opts) {
    validateInput(raw, opts);
    const state = normalize(raw);
    if (!plain(state) || state.v !== 4 || !plain(state.profile) || !plain(state.settings) ||
        !Array.isArray(state.habits) || !Array.isArray(state.skills) || !Array.isArray(state.skillLog) ||
        !plain(state.completions) || !plain(state.days) || !plain(state.streak) || !plain(state.unlocked) ||
        !Array.isArray(state.purchases) || !plain(state.dailyQuest) || !plain(state.meta)) {
      throw new Error('The saved record could not be normalized safely.');
    }
    return state;
  }
  function sanitize(raw, opts) {
    const options = opts || {
      allowMissingVersion: !!raw && raw.v === undefined,
      requireCurrent: !!raw && raw.v === 4,
      requireLegacyBackup: !!raw && (raw.v === undefined || Number(raw.v) < 4)
    };
    return validState(raw, options);
  }
  function setRecovery(reason, records, candidate) {
    if (!recovery) recovery = { reason, records: records || [], candidate: candidate || null };
    else if (candidate) recovery.candidate = candidate;
  }
  function readRawRecords() {
    const records = [];
    for (const key of [KEY, ...LEGACY_KEYS]) {
      try { const raw = g.localStorage.getItem(key); if (raw !== null) records.push({ key, raw }); }
      catch (e) { records.push({ key, raw: null, readError: String(e && e.name || 'StorageError') }); }
    }
    return records;
  }
  function failLoad(reason, key, raw, error) {
    const records = readRawRecords();
    if (raw !== null && !records.some(x => x.key === key)) records.push({ key, raw });
    setRecovery(reason, records);
    console.warn('HunterArsenal: saved data requires recovery.', error || reason);
    return null;
  }
  function writeState(candidate, resolving, failureReason = 'write-failure') {
    if (recovery && !resolving) return false;
    let previous = null, serialized = null, writeStarted = false, observedAfterWrite = null, verificationMismatch = false;
    try {
      const state = validState(candidate, { requireCurrent: true });
      serialized = JSON.stringify(state);
      if (typeof serialized !== 'string') throw new Error('State could not be serialized.');
      previous = g.localStorage.getItem(KEY);
      if (!resolving && previous !== lastKnownRaw) {
        setRecovery('concurrent-write', readRawRecords().concat(previous !== null ? [{ key: KEY, raw: previous }] : []), serialized);
        return false;
      }
      writeStarted = true;
      g.localStorage.setItem(KEY, serialized);
      observedAfterWrite = g.localStorage.getItem(KEY);
      if (observedAfterWrite !== serialized) { verificationMismatch = true; throw new Error('Storage verification did not match the saved data.'); }
      lastKnownRaw = serialized;
      if (resolving) {
        recovery = null;
        for (const key of LEGACY_KEYS) { try { g.localStorage.removeItem(key); } catch (e) { /* current verified record remains authoritative */ } }
      }
      return true;
    } catch (e) {
      let rollbackVerified = !writeStarted;
      if (writeStarted && !verificationMismatch) {
        try {
          if (previous === null) g.localStorage.removeItem(KEY); else g.localStorage.setItem(KEY, previous);
          rollbackVerified = g.localStorage.getItem(KEY) === previous;
        } catch (rollbackError) { rollbackVerified = false; }
      } else if (verificationMismatch) rollbackVerified = false;
      console.warn('HunterArsenal: save failed; recovery is required.', e);
      const reason = verificationMismatch ? 'concurrent-write' : rollbackVerified ? failureReason : 'rollback-failure';
      setRecovery(reason, readRawRecords().concat(previous !== null ? [{ key: KEY, raw: previous }] : [], observedAfterWrite !== null ? [{ key: KEY, raw: observedAfterWrite }] : []), serialized);
      return false;
    }
  }
  function load() {
    if (recovery) {
      if (recovery.reason !== 'migration-failure') return null;
      recovery = null; // Explicit retry path: only a failed migration may be retried from its preserved source.
    }
    lastKnownRaw = null;
    let current, legacy = null;
    try {
      current = g.localStorage.getItem(KEY);
      if (current === null) {
        for (const key of LEGACY_KEYS) { const raw = g.localStorage.getItem(key); if (raw !== null) { legacy = { key, raw }; break; } }
      }
    } catch (e) { return failLoad('read-failure', KEY, null, e); }
    const source = current !== null ? { key: KEY, raw: current } : legacy;
    if (!source) return defaults();
    lastKnownRaw = current;
    let parsed, state;
    try {
      parsed = JSON.parse(source.raw);
      const isLegacyKey = source.key !== KEY;
      state = validState(parsed, {
        allowMissingVersion: isLegacyKey,
        requireCurrent: Number(parsed && parsed.v) === 4,
        requireLegacyBackup: isLegacyKey || Number(parsed && parsed.v) < 4
      });
    } catch (e) { return failLoad('invalid-saved-record', source.key, source.raw, e); }
    const oldVersion = parsed.v === undefined || Number(parsed.v) < 4;
    if (source.key !== KEY || oldVersion) {
      if (!writeState(state, false, 'migration-failure')) return null;
      if (source.key !== KEY) { try { g.localStorage.removeItem(source.key); } catch (e) { /* verified current record is already authoritative */ } }
    }
    if (source.key === KEY && !oldVersion) lastKnownRaw = source.raw;
    return state;
  }
  function save(S) { return writeState(S, false); }
  function restore(S) { const ok = writeState(S, true); return { ok, state: ok ? validState(S) : null }; }
  function reset() {
    let state;
    try { state = defaults(); }
    catch (e) { setRecovery('reset-failure', readRawRecords()); console.warn('HunterArsenal: reset initialization failed.', e); return { ok: false, state: null }; }
    if (!writeState(state, true)) return { ok: false, state: null };
    return { ok: true, state };
  }
  function isRecoveryRequired() { return !!recovery; }
  function recoveryInfo() { return recovery ? { reason: recovery.reason, records: recovery.records.map(x => ({ key: x.key, available: typeof x.raw === 'string', readError: x.readError || null })) } : null; }
  function exportRecovery() {
    if (!recovery) throw new Error('Recovery is not active.');
    return JSON.stringify({ app: 'HunterArsenal', format: 'recovery-export', exportedAt: new Date().toISOString(), reason: recovery.reason, records: recovery.records, candidate: recovery.candidate }, null, 2);
  }
  function exportJSON(S) {
    return JSON.stringify({ app: 'HunterArsenal', version: g.APP_VERSION, exportedAt: new Date().toISOString(), data: S }, null, 2);
  }
  function importJSON(text) {
    if (typeof text !== 'string' || text.length > 8e6) throw new Error('File too large or invalid.');
    const j = JSON.parse(text);
    const data = j && j.app === 'HunterArsenal' && j.data ? j.data : null;
    if (!data) throw new Error('Not a HunterArsenal backup');
    const legacy = data.v === undefined || Number(data.v) < 4;
    return validState(data, { allowMissingVersion: legacy, requireCurrent: !legacy, requireLegacyBackup: legacy });
  }
  function wipe() { return reset(); }

  HA.Store = { KEY, defaults, sanitize, load, save, restore, reset, isRecoveryRequired, recoveryInfo, exportRecovery, exportJSON, importJSON, wipe, uid, validateInput };
})(typeof self !== 'undefined' ? self : window);
