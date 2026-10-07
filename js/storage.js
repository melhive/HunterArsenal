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
      v: 3,
      profile: { name: 'Hunter', avatar: null, hunterId: makeHunterId(), createdAt: now, equippedTitle: null, birthdate: '', lifespan: 80 },
      settings: { theme: 'default', sound: false, penalties: false },
      habits: [], skills: [], skillLog: [], completions: {}, days: {},
      streak: { combo: 0, best: 0, freezes: 0, processed: G.addDays(today, -1) },
      unlocked: { achievements: {}, titles: {}, challenges: {} },
      purchases: [], dailyQuest: { state: 'none', at: null, day: null, completed: 0, repeat: null },
      meta: { lastSeenVersion: null, onboarded: false }
    };
  }

  function sanitize(raw) {
    const base = defaults(), r = obj(raw), p = obj(r.profile), s = obj(r.settings);
    const out = base;
    out.profile.name = str(p.name, 24, 'Hunter') || 'Hunter';
    if (out.profile.name === 'Operator') out.profile.name = 'Hunter';   // v2.2.0 default, restored to Hunter
    out.profile.avatar = typeof p.avatar === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.avatar) && p.avatar.length < 450000 ? p.avatar : null;
    out.profile.hunterId = typeof p.hunterId === 'string' && /^HA-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(p.hunterId) ? p.hunterId : base.profile.hunterId;
    out.profile.createdAt = clamp(p.createdAt, 946684800000, Date.now() + 864e5, base.profile.createdAt);
    out.profile.equippedTitle = G.TITLES.some(t => t.id === p.equippedTitle) ? p.equippedTitle : null;
    out.profile.birthdate = DATE_RE.test(p.birthdate || '') ? p.birthdate : '';
    out.profile.lifespan = Math.round(clamp(p.lifespan, 30, 120, 80));
    out.settings.theme = G.THEMES.some(t => t.id === s.theme) ? s.theme : 'default';
    out.settings.sound = s.sound === true; out.settings.penalties = s.penalties === true;

    const seen = new Set();
    out.habits = arr(r.habits).slice(0, 200).map(h => {
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
    let activeCount = 0;                                           // Core rule: at most 8 active habits
    out.habits.forEach(h => { if (!h.archived && ++activeCount > G.CONST.MAX_ACTIVE_HABITS) h.archived = true; });

    const sk = new Set();
    out.skills = arr(r.skills).slice(0, 100).map(x => {
      x = obj(x); if (!ID_RE.test(x.id || '') || sk.has(x.id)) return null; sk.add(x.id);
      return { id: x.id, name: str(x.name, 50) || 'Skill', desc: str(x.desc, 100), icon: ICON_RE.test(x.icon || '') ? x.icon : 'book', attr: G.ATTRS[x.attr] ? x.attr : 'INT', created: DATE_RE.test(x.created || '') ? x.created : G.todayKey() };
    }).filter(Boolean);
    out.skillLog = arr(r.skillLog).slice(0, 20000).map(e => { e = obj(e); return sk.has(e.id) && DATE_RE.test(e.d || '') ? { id: e.id, d: e.d, xp: G.CONST.PRACTICE_XP, at: clamp(e.at, 0, 4e12, 0) } : null; }).filter(Boolean);

    const comps = obj(r.completions); let n = 0;
    for (const d of Object.keys(comps)) {
      if (!DATE_RE.test(d)) continue;
      const day = {};
      for (const id of Object.keys(obj(comps[d]))) {
        if (!ID_RE.test(id) || ++n > 60000) continue;
        const c = obj(comps[d][id]);
        // XP values are canonical: whatever a file claims, a check-in is always worth the fixed amounts.
        day[id] = { xp: G.CONST.HUNTER_XP, ax: G.CONST.ATTR_XP, mx: G.CONST.MASTERY_XP, attr: G.ATTRS[c.attr] ? c.attr : 'STR', at: clamp(c.at, 0, 4e12, 0) };
      }
      if (Object.keys(day).length) out.completions[d] = day;
    }
    const days = obj(r.days);
    for (const d of Object.keys(days)) {
      if (!DATE_RE.test(d)) continue; const x = obj(days[d]);
      out.days[d] = { sched: Math.round(clamp(x.sched, 0, 200, 0)), done: Math.round(clamp(x.done, 0, 200, 0)), perfect: x.perfect === true, penalty: Math.round(clamp(x.penalty, 0, 100, 0)), dq: x.dq > 0 ? G.CONST.DAILY_QUEST_BONUS : 0, frozen: x.frozen === true };
    }
    const st = obj(r.streak);
    out.streak = { combo: Math.round(clamp(st.combo, 0, 5000, 0)), best: Math.round(clamp(st.best, 0, 5000, 0)), freezes: Math.round(clamp(st.freezes, 0, G.CONST.FREEZE_CAP, 0)), processed: DATE_RE.test(st.processed || '') ? st.processed : base.streak.processed };
    if (out.streak.processed > G.todayKey()) out.streak.processed = G.addDays(G.todayKey(), -1);
    const un = obj(r.unlocked);
    G.ACHIEVEMENTS.forEach(a => { const t = obj(un.achievements)[a.id]; if (t) out.unlocked.achievements[a.id] = clamp(t, 0, 4e12, Date.now()); });
    G.TITLES.forEach(a => { const t = obj(un.titles)[a.id]; if (t) out.unlocked.titles[a.id] = clamp(t, 0, 4e12, Date.now()); });
    G.CHALLENGES.forEach(a => { const t = obj(un.challenges)[a.id]; if (t) out.unlocked.challenges[a.id] = clamp(t, 0, 4e12, Date.now()); });
    out.purchases = arr(r.purchases).slice(0, 50).map(p => { p = obj(p); const th = G.THEMES.find(t => t.id === p.id); return th && th.unlock.type === 'hc' ? { id: th.id, cost: th.unlock.value, at: clamp(p.at, 0, 4e12, 0) } : null; }).filter(Boolean);
    const dq = obj(r.dailyQuest), states = ['none', 'scheduled', 'available', 'accepted', 'completed', 'failed', 'declined'];
    out.dailyQuest = { state: states.includes(dq.state) ? dq.state : 'none', at: dq.at ? clamp(dq.at, 0, 4e12, null) : null, day: DATE_RE.test(dq.day || '') ? dq.day : null, completed: Math.round(clamp(dq.completed, 0, 100000, 0)), repeat: /^([01]\d|2[0-3]):[0-5]\d$/.test(dq.repeat || '') ? dq.repeat : null };
    const m = obj(r.meta);
    out.meta = { lastSeenVersion: str(m.lastSeenVersion, 16, '') || null, onboarded: m.onboarded === true };
    return out;
  }

  function load() {
    try {
      let raw = g.localStorage.getItem(KEY), migrated = false;
      for (let i = 0; !raw && i < LEGACY_KEYS.length; i++) { raw = g.localStorage.getItem(LEGACY_KEYS[i]); migrated = !!raw; }
      if (raw) { const S = sanitize(JSON.parse(raw)); if (migrated) save(S); return S; }
    } catch (e) { console.warn('HunterArsenal: could not read saved data, starting fresh.', e); }
    return defaults();
  }
  function save(S) {
    try { g.localStorage.setItem(KEY, JSON.stringify(S)); return true; }
    catch (e) { console.warn('HunterArsenal: save failed', e); return false; }
  }
  function exportJSON(S) {
    return JSON.stringify({ app: 'HunterArsenal', version: g.APP_VERSION, exportedAt: new Date().toISOString(), data: S }, null, 2);
  }
  function importJSON(text) {
    if (text.length > 8e6) throw new Error('File too large');
    const j = JSON.parse(text);
    const data = j && j.app === 'HunterArsenal' && j.data ? j.data : null;
    if (!data || !Array.isArray(data.habits)) throw new Error('Not a HunterArsenal backup');
    return sanitize(data);
  }
  function wipe() { g.localStorage.removeItem(KEY); }

  HA.Store = { KEY, defaults, sanitize, load, save, exportJSON, importJSON, wipe, uid };
})(typeof self !== 'undefined' ? self : window);
