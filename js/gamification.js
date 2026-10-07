/* HunterArsenal progression engine.
 * Pure logic, no DOM. Every number that affects progression lives in CONST below.
 * Authoritative data = completion log + unlock records. Level, rank, attributes, class,
 * mastery and HC balance are DERIVED from it every time (single source of truth). */
(function (g) {
  'use strict';
  const HA = (g.HA = g.HA || {});

  /* ------------------------------------------------------------ constants */
  const CONST = {
    MAX_LEVEL: 100, MAX_ACTIVE_HABITS: 8,
    // Core Progression: every completed habit gives flat XP to three independent systems.
    HUNTER_XP: 10, ATTR_XP: 5, MASTERY_XP: 5,
    // [level, total Hunter XP at the start of that level]; levels in between are interpolated.
    LEVEL_ANCHORS: [[1, 0], [13, 1500], [30, 6000], [50, 14000], [70, 25000], [90, 38000], [100, 48000]],
    ATTR_TIER_STARTS: [0, 100, 400, 900, 1600],               // attribute XP where tiers I..V begin
    MASTERY_STARTS: [0, 50, 150, 400, 700, 1000, 2500],        // Awakened..Ascendant (Elite value is provisional)
    FREEZE_EVERY: 7, FREEZE_CAP: 3,
    PENALTY_PER_MISS: 5, PENALTY_DAY_CAP: 15,                  // optional, Hunter XP only
    DAILY_QUEST_BONUS: 25, DAILY_QUEST_FAIL_PENALTY: 10,       // Hunter XP only
    DAILY_QUEST_REOPEN_DELAY_MS: 2000,                         // missed-schedule popup delay (spec: ~2s)
    PRACTICE_XP: 5, PRACTICE_PER_DAY: 3,
    VERSATILE_MIN_XP: 100,                                     // top attribute must have reached tier II
    VERSATILE_CLOSE_RATIO: 0.9                                 // runner-up within 10% of the top
  };

  const RANKS = [
    { id: 'E', minLevel: 1,  title: 'Provisional Hunter',    color: '#aeb7c2' },
    { id: 'D', minLevel: 13, title: 'Field Hunter',    color: '#6fa58a' },
    { id: 'C', minLevel: 30, title: 'Senior Hunter',     color: '#43a8ba' },
    { id: 'B', minLevel: 50, title: 'Lead Hunter',   color: '#8a86b8' },
    { id: 'A', minLevel: 70, title: 'Principal Hunter',  color: '#c0a263' },
    { id: 'S', minLevel: 90, title: 'Chief Hunter', color: '#b0586c' }
  ];

  const ATTR_ORDER = ['STR', 'VIT', 'INT', 'PER', 'CHA'];
  const ATTRS = {
    STR: { id: 'STR', name: 'Strength',   icon: 'muscle',       color: '#b5575f', blurb: 'Physical power. Skill. Action.',
           classes: ['Brawler', 'Berserker', 'Warbringer', 'Juggernaut', 'Titan'] },
    VIT: { id: 'VIT', name: 'Vitality',   icon: 'shieldplus', color: '#5f9e7e', blurb: 'Endurance. Health. Resilience.',
           classes: ['Survivor', 'Endurer', 'Bastion', 'Immortal', 'Colossus'] },
    INT: { id: 'INT', name: 'Intellect',  icon: 'book',       color: '#4a9bb0', blurb: 'Knowledge. Strategy. Problem solving.',
           classes: ['Thinker', 'Analyst', 'Strategist', 'Sage', 'Archon'] },
    PER: { id: 'PER', name: 'Perception', icon: 'eye',        color: '#8b7db3', blurb: 'Awareness. Observation. Insight.',
           classes: ['Observer', 'Tracker', 'Pathfinder', 'Seer', 'Oracle'] },
    CHA: { id: 'CHA', name: 'Charisma',   icon: 'people',     color: '#b99a5c', blurb: 'Communication. Influence. Connection.',
           classes: ['Speaker', 'Charmer', 'Luminary', 'Commander', 'Sovereign'] }
  };
  const TIER_ROMAN = ['I', 'II', 'III', 'IV', 'V'];

  const MASTERY = ['INITIATED', 'CALIBRATED', 'PROFICIENT', 'QUALIFIED', 'ADVANCED', 'EXPERT', 'AUTHORITY'];

  /* ------------------------------------------------------------ dates */
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
  const todayKey = () => keyOf(new Date());

  /* ------------------------------------------------------------ levels & ranks */
  const LEVEL_START = [0, 0];                       // LEVEL_START[L] = total Hunter XP at the start of level L
  (function build() {
    const an = CONST.LEVEL_ANCHORS;
    for (let L = 2; L <= CONST.MAX_LEVEL; L++) {
      let i = 0; while (i < an.length - 2 && L > an[i + 1][0]) i++;
      const [l0, x0] = an[i], [l1, x1] = an[i + 1];
      LEVEL_START[L] = Math.round(x0 + ((x1 - x0) * (L - l0)) / (l1 - l0));
    }
  })();
  const levelNeed = L => (L >= CONST.MAX_LEVEL ? 0 : LEVEL_START[L + 1] - LEVEL_START[L]);

  function levelInfo(xp) {
    xp = Math.max(0, Math.floor(xp));
    let L = 1;
    while (L < CONST.MAX_LEVEL && xp >= LEVEL_START[L + 1]) L++;
    if (L >= CONST.MAX_LEVEL) return { level: L, cur: xp - LEVEL_START[L], need: 0, pct: 100, max: true, total: xp };
    const need = levelNeed(L), cur = xp - LEVEL_START[L];
    return { level: L, cur, need, pct: (cur / need) * 100, max: false, total: xp };
  }
  function rankForLevel(L) {
    let idx = 0;
    RANKS.forEach((r, i) => { if (L >= r.minLevel) idx = i; });
    return { idx, ...RANKS[idx] };
  }
  const rankStartXP = idx => LEVEL_START[RANKS[idx].minLevel];
  /* progress of total Hunter XP through the current rank toward the next rank */
  function rankProgress(xp) {
    const rk = rankForLevel(levelInfo(xp).level), nx = RANKS[rk.idx + 1] || null;
    const start = rankStartXP(rk.idx), next = nx ? LEVEL_START[nx.minLevel] : LEVEL_START[CONST.MAX_LEVEL];
    return { rank: rk, next: nx, start, nextXP: next, max: !nx, pct: nx ? ((xp - start) / (next - start)) * 100 : 100 };
  }

  /* ------------------------------------------------------------ tiers (attributes, mastery, skills) */
  /* starts[i] = XP where tier i begins; names[i] = its name. */
  function tierProgress(xp, starts, names) {
    xp = Math.max(0, Math.floor(xp));
    let idx = 0;
    while (idx + 1 < starts.length && xp >= starts[idx + 1]) idx++;
    const max = idx >= starts.length - 1;
    const base = starts[idx], next = max ? starts[starts.length - 1] : starts[idx + 1];
    return {
      idx, max, xp, base, next, no: idx + 1,
      name: names[idx], nextName: max ? null : names[idx + 1],
      pct: max ? 100 : ((xp - base) / Math.max(1, next - base)) * 100
    };
  }
  const attrTier = (attr, xp) => tierProgress(xp, CONST.ATTR_TIER_STARTS, ATTRS[attr].classes);
  const masteryTier = xp => tierProgress(xp, CONST.MASTERY_STARTS, MASTERY);

  function classInfo(attrXp) {
    const sorted = ATTR_ORDER.map(a => ({ a, xp: attrXp[a] || 0 })).sort((x, y) => y.xp - x.xp || ATTR_ORDER.indexOf(x.a) - ATTR_ORDER.indexOf(y.a));
    const top = sorted[0], second = sorted[1];
    const versatile = top.xp >= CONST.VERSATILE_MIN_XP && second.xp >= top.xp * CONST.VERSATILE_CLOSE_RATIO;
    const t = attrTier(top.a, top.xp);
    return { attr: top.a, name: t.name, tier: t, versatile, runnerUp: second.a, sorted };
  }

  /* ------------------------------------------------------------ habits & days */
  const activeHabits = S => S.habits.filter(h => !h.archived);
  function habitScheduledOn(h, d) {
    if (h.archived || h.created > d) return false;
    return !h.days || h.days.includes(parseKey(d).getDay());
  }
  const scheduledHabits = (S, d) => S.habits.filter(h => habitScheduledOn(h, d));
  const dayRec = (S, d) => (S.days[d] = S.days[d] || { sched: 0, done: 0, perfect: false, penalty: 0, dq: 0 });

  function totalXP(S) {
    let x = 0;
    for (const d in S.completions) for (const id in S.completions[d]) x += S.completions[d][id].xp;
    for (const d in S.days) { const r = S.days[d]; x += (r.dq || 0) - (r.penalty || 0); }
    return Math.max(0, x);
  }
  function attrXP(S) {
    const o = { STR: 0, VIT: 0, INT: 0, PER: 0, CHA: 0 };
    for (const d in S.completions) for (const id in S.completions[d]) { const c = S.completions[d][id]; if (o[c.attr] !== undefined) o[c.attr] += c.ax; }
    return o;
  }
  function masteryXPMap(S) {
    const m = {};
    for (const d in S.completions) for (const id in S.completions[d]) m[id] = (m[id] || 0) + S.completions[d][id].mx;
    return m;
  }
  function habitStats(S, h, today) {
    let total = 0, streak = 0;
    for (const d in S.completions) if (S.completions[d][h.id]) total++;
    let d = today;
    if (!(S.completions[d] && S.completions[d][h.id])) d = addDays(d, -1);
    for (let i = 0; i < 800; i++) {
      if (d < h.created) break;
      if (h.days && !h.days.includes(parseKey(d).getDay())) { d = addDays(d, -1); continue; }
      if (S.completions[d] && S.completions[d][h.id]) streak++; else break;
      d = addDays(d, -1);
    }
    return { total, streak };
  }

  /* Recompute the day record for `d` (today) after any change to habits/completions. Returns events. */
  function refreshDay(S, d) {
    const ev = { becamePerfect: false, lostPerfect: false, dqCompleted: false, dqReverted: false };
    const r = dayRec(S, d), sched = scheduledHabits(S, d);
    const done = sched.filter(h => S.completions[d] && S.completions[d][h.id]).length;
    const was = r.perfect;
    r.sched = sched.length; r.done = done;
    r.perfect = sched.length > 0 && done === sched.length;
    if (r.perfect && !was) ev.becamePerfect = true;
    if (!r.perfect && was) ev.lostPerfect = true;
    const dq = S.dailyQuest;
    if (dq.state === 'accepted' && dq.day === d && r.perfect) {
      dq.state = 'completed'; dq.completed = (dq.completed || 0) + 1; r.dq = CONST.DAILY_QUEST_BONUS; ev.dqCompleted = true;
    } else if (dq.state === 'completed' && dq.day === d && !r.perfect) {
      dq.state = 'accepted'; dq.completed = Math.max(0, (dq.completed || 1) - 1); r.dq = 0; ev.dqReverted = true;
    }
    return ev;
  }

  /* Finalise every day before `today`: streak/combo, freezes, penalties, Daily Quest failure. */
  function processDays(S, today) {
    let d = addDays(S.streak.processed, 1), changed = false;
    const events = [];
    while (d < today) {
      const r = S.days[d];
      const sched = scheduledHabits(S, d).length;
      const dq = S.dailyQuest;
      if (r && r.perfect) {
        S.streak.combo++;
        S.streak.best = Math.max(S.streak.best, S.streak.combo);
        if (S.streak.combo % CONST.FREEZE_EVERY === 0 && S.streak.freezes < CONST.FREEZE_CAP) { S.streak.freezes++; events.push({ type: 'freeze', d }); }
      } else if (sched > 0) {
        const missed = sched - (r ? r.done : 0);
        const rec = dayRec(S, d);
        if (S.streak.freezes > 0) { S.streak.freezes--; rec.frozen = true; events.push({ type: 'frozen', d }); }
        else {
          if (S.streak.combo > 0) events.push({ type: 'comboLost', d, combo: S.streak.combo });
          S.streak.combo = 0;
          if (S.settings.penalties) { rec.penalty = Math.min(CONST.PENALTY_DAY_CAP, missed * CONST.PENALTY_PER_MISS); events.push({ type: 'penalty', d, xp: rec.penalty }); }
        }
      }
      if (dq.state === 'accepted' && dq.day <= d) {
        dq.state = 'failed'; dayRec(S, d).penalty = (S.days[d].penalty || 0) + CONST.DAILY_QUEST_FAIL_PENALTY; events.push({ type: 'dqFailed', d });
      }
      S.streak.processed = d; d = addDays(d, 1); changed = true;
    }
    return { changed, events };
  }

  /* ------------------------------------------------------------ completing habits */
  function toggleHabit(S, habitId, d, now) {
    const h = S.habits.find(x => x.id === habitId);
    if (!h || h.archived) return null;
    S.completions[d] = S.completions[d] || {};
    if (S.completions[d][habitId]) {                              // one completion per habit per day; tap again to undo
      delete S.completions[d][habitId];
      if (!Object.keys(S.completions[d]).length) delete S.completions[d];
      return { done: false, xp: 0, habit: h };
    }
    S.completions[d][habitId] = { xp: CONST.HUNTER_XP, ax: CONST.ATTR_XP, mx: CONST.MASTERY_XP, attr: h.attr, at: now };
    return { done: true, xp: CONST.HUNTER_XP, ax: CONST.ATTR_XP, mx: CONST.MASTERY_XP, habit: h };
  }

  /* ------------------------------------------------------------ skills (practice logging; separate from Hunter XP) */
  const skillXP = (S, id) => S.skillLog.reduce((a, e) => a + (e.id === id ? e.xp : 0), 0);
  function practiceSkill(S, id, d, now) {
    const today = S.skillLog.filter(e => e.id === id && e.d === d).length;
    if (today >= CONST.PRACTICE_PER_DAY) return null;
    S.skillLog.push({ id, d, xp: CONST.PRACTICE_XP, at: now });
    return { xp: CONST.PRACTICE_XP, left: CONST.PRACTICE_PER_DAY - today - 1 };
  }

  /* ------------------------------------------------------------ Daily Quest cycle */
  /* none -> scheduled -> available -> accepted -> completed | failed ; declined ends the cycle.
   * A finished cycle never locks the system: the user can always schedule another time. */
  const dqCanSchedule = S => S.dailyQuest.state !== 'accepted';
  function dqSchedule(S, ts) { S.dailyQuest.state = 'scheduled'; S.dailyQuest.at = ts; S.dailyQuest.day = null; }
  /* Repeat: a fixed time of day ("HH:MM") that re-arms itself after every finished cycle, so it never needs rescheduling. */
  const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  function dqNextAt(hhmm, now) {
    const [h, m] = hhmm.split(':').map(Number), d = new Date(now);
    d.setHours(h, m, 0, 0); if (d.getTime() <= now) d.setDate(d.getDate() + 1);
    return d.getTime();
  }
  function dqSetRepeat(S, hhmm, now) {
    if (!TIME_RE.test(hhmm)) return false;
    const dq = S.dailyQuest; dq.repeat = hhmm;
    if (dq.state !== 'accepted' && dq.state !== 'available') dqSchedule(S, dqNextAt(hhmm, now));
    return true;
  }
  function dqStopRepeat(S) {
    const dq = S.dailyQuest; dq.repeat = null;
    if (dq.state === 'scheduled') { dq.state = 'none'; dq.at = null; }
  }
  function dqTick(S, now) {
    const dq = S.dailyQuest, todayK = keyOf(new Date(now));
    // re-arm after a finished cycle. A cleared mission waits for the day to end first, so un-ticking a protocol can still revert it.
    if (dq.repeat && (dq.state === 'none' || dq.state === 'failed' || dq.state === 'declined' || (dq.state === 'completed' && dq.day && dq.day < todayK))) dqSchedule(S, dqNextAt(dq.repeat, now));
    if (dq.state === 'scheduled' && dq.at && now >= dq.at) { dq.state = 'available'; return true; }
    return false;
  }
  function dqAccept(S, d) { S.dailyQuest.state = 'accepted'; S.dailyQuest.day = d; }
  function dqDecline(S) { S.dailyQuest.state = 'declined'; }

  /* ------------------------------------------------------------ context for unlock rules */
  function context(S, today) {
    let completions = 0, early = 0, activeDays = 0;
    const attrDone = { STR: 0, VIT: 0, INT: 0, PER: 0, CHA: 0 };
    for (const d in S.completions) {
      const ids = Object.keys(S.completions[d]);
      if (ids.length) activeDays++;
      ids.forEach(id => {
        const c = S.completions[d][id]; completions++;
        if (attrDone[c.attr] !== undefined) attrDone[c.attr]++;
        if (c.at && new Date(c.at).getHours() < 6) early++;
      });
    }
    let perfectDays = 0;
    for (const d in S.days) if (S.days[d].perfect) perfectDays++;
    const t = S.days[today];
    const combo = S.streak.combo + (t && t.perfect ? 1 : 0);
    const xp = totalXP(S), li = levelInfo(xp), rank = rankForLevel(li.level);
    const ax = attrXP(S), cls = classInfo(ax);
    const mx = masteryXPMap(S);
    let masteryMax = 0;
    S.habits.forEach(h => { masteryMax = Math.max(masteryMax, masteryTier(mx[h.id] || 0).idx); });
    const attrIdx = {}; ATTR_ORDER.forEach(a => { attrIdx[a] = attrTier(a, ax[a]).idx; });
    return {
      completions, perfectDays, combo, bestCombo: Math.max(S.streak.best, combo), xp, level: li.level, rankIdx: rank.idx,
      attrXp: ax, attrIdx, attrsPast1: ATTR_ORDER.filter(a => ax[a] >= CONST.ATTR_TIER_STARTS[1]).length,
      maxAttrIdx: Math.max(...ATTR_ORDER.map(a => attrIdx[a])), versatile: cls.versatile,
      early, activeDays, attrDone, masteryMax,
      activeHabits: activeHabits(S).length, skills: S.skills.length, sessions: S.skillLog.length, dqDone: S.dailyQuest.completed || 0,
      achievements: Object.keys(S.unlocked.achievements).length, titles: Object.keys(S.unlocked.titles).length
    };
  }

  /* ------------------------------------------------------------ definitions: achievements, titles, challenges */
  const A = (id, name, desc, icon, tone, reward, target, progress, hidden) => ({ id, name, desc, icon, tone, reward, target, progress, hidden: !!hidden });
  const ACHIEVEMENTS = [
    A('first_step', 'FIRST ENTRY', 'Log your first protocol.', 'star', '#b99a5c', 25, 1, c => c.completions),
    A('streak3', '3-DAY CONTINUITY', 'Maintain 3 consecutive perfect days.', 'calendar', '#3ab0c2', 30, 3, c => c.bestCombo),
    A('streak7', '7-DAY CONTINUITY', 'Maintain 7 consecutive days.', 'calendar', '#3ab0c2', 50, 7, c => c.bestCombo),
    A('streak14', '14-DAY CONTINUITY', 'Maintain 14 consecutive days.', 'flame', '#b98a50', 100, 14, c => c.bestCombo),
    A('streak30', '30-DAY CONTINUITY', 'Maintain 30 consecutive days.', 'flame', '#b5575f', 250, 30, c => c.bestCombo),
    A('check100', '100 ENTRIES', 'Reach 100 total check-ins.', 'target', '#8b7db3', 100, 100, c => c.completions),
    A('check500', '500 ENTRIES', 'Reach 500 total check-ins.', 'target', '#8b7db3', 250, 500, c => c.completions),
    A('perfect1', 'CLEAN DAY', 'Clear every scheduled protocol in one day.', 'check', '#5f9e7e', 40, 1, c => c.perfectDays),
    A('perfect10', 'FIELD DISCIPLINE', 'Earn 10 perfect days.', 'moon', '#b5575f', 100, 10, c => c.perfectDays),
    A('lvl10', 'FIELD READY', 'Reach level 10.', 'arrowup', '#3ab0c2', 75, 10, c => c.level),
    A('lvl25', 'SENIOR STATUS', 'Reach level 25.', 'arrowup', '#3ab0c2', 150, 25, c => c.level),
    A('lvl50', 'ELITE STATUS', 'Reach level 50.', 'crown', '#c0a263', 300, 50, c => c.level),
    A('rank_d', 'PROMOTION: D-RANK', 'Reach D-Rank.', 'arrowup', '#6fa58a', 100, 1, c => c.rankIdx),
    A('rank_c', 'PROMOTION: C-RANK', 'Reach C-Rank.', 'arrowup', '#43a8ba', 200, 2, c => c.rankIdx),
    A('rank_b', 'PROMOTION: B-RANK', 'Reach B-Rank.', 'arrowup', '#8a86b8', 300, 3, c => c.rankIdx),
    A('forged', 'PROTOCOL CALIBRATED', 'Reach CALIBRATED in any protocol.', 'dumbbell', '#3ab0c2', 75, 1, c => c.masteryMax),
    A('veteran', 'PROTOCOL QUALIFIED', 'Reach QUALIFIED in any protocol.', 'dumbbell', '#8a86b8', 150, 3, c => c.masteryMax),
    A('balanced', 'BALANCED PROFILE', `Bring all five attributes to ${CONST.ATTR_TIER_STARTS[1]} XP.`, 'people', '#b99a5c', 100, 5, c => c.attrsPast1),
    A('specialist', 'SPECIALIST', 'Reach class tier III in any attribute.', 'fist', '#b5575f', 150, 2, c => c.maxAttrIdx),
    A('arsenal5', 'PROTOCOL SUITE', 'Keep 5 active protocols.', 'list', '#3ab0c2', 25, 5, c => c.activeHabits),
    A('skilled', 'FIRST SKILL', 'Add your first skill.', 'book', '#5f9e7e', 25, 1, c => c.skills),
    A('dq1', 'MISSION COMPLETE', 'Clear your first Daily Mission.', 'bolt', '#3ab0c2', 60, 1, c => c.dqDone),
    A('earlybird', 'EARLY START', 'Complete a protocol before 6 AM.', 'sun', '#c0a263', 40, 1, c => c.early, true),
    A('ascendant', 'AUTHORITY', 'Reach AUTHORITY in any protocol.', 'crown', '#b0586c', 500, 6, c => c.masteryMax, true),
    A('lvl100', 'MAXIMUM CLEARANCE', 'Reach level 100.', 'crown', '#b0586c', 1000, 100, c => c.level, true)
  ];

  const T = (id, cat, name, desc, icon, target, progress) => ({ id, cat, name, desc, icon, target, progress });
  const attrTitle = (id, name, desc, a) => T(id, 'Attribute', name, desc, ATTRS[a].icon, CONST.ATTR_TIER_STARTS[1], c => c.attrXp[a]);
  const TITLES = [
    T('first', 'Milestone', 'Day One', 'Log your first protocol.', 'flame', 1, c => c.completions),
    T('committed', 'Milestone', 'Committed', 'Reach 50 check-ins.', 'target', 50, c => c.completions),
    T('centurion', 'Milestone', 'Centurion', 'Reach 100 check-ins.', 'target', 100, c => c.completions),
    T('relentless', 'Milestone', 'Relentless', 'Reach 500 check-ins.', 'target', 500, c => c.completions),
    T('thousand', 'Milestone', 'Long Service', 'Reach 1,000 check-ins.', 'target', 1000, c => c.completions),
    T('flawless', 'Milestone', 'Flawless', 'Earn your first perfect day.', 'check', 1, c => c.perfectDays),
    T('ironwill', 'Continuity', 'Steady', 'Reach a 3-day continuity.', 'flame', 3, c => c.bestCombo),
    T('weekwarrior', 'Continuity', 'Sustained', 'Reach a 7-day continuity.', 'flame', 7, c => c.bestCombo),
    T('fortnight', 'Continuity', 'Consistent', 'Reach a 14-day continuity.', 'flame', 14, c => c.bestCombo),
    T('unbreakable', 'Continuity', 'Unbroken', 'Reach a 30-day continuity.', 'flame', 30, c => c.bestCombo),
    T('forgedfire', 'Mastery', 'Calibrated', 'Reach CALIBRATED in any protocol.', 'dumbbell', 1, c => c.masteryMax),
    T('seasoned', 'Mastery', 'Qualified Hunter', 'Reach QUALIFIED in any protocol.', 'dumbbell', 3, c => c.masteryMax),
    T('eliteop', 'Mastery', 'Advanced Hunter', 'Reach ADVANCED in any protocol.', 'dumbbell', 4, c => c.masteryMax),
    T('ascendant', 'Mastery', 'Authority', 'Reach AUTHORITY in any protocol.', 'crown', 6, c => c.masteryMax),
    attrTitle('ironbody', 'Conditioned', `Reach ${CONST.ATTR_TIER_STARTS[1]} Strength XP.`, 'STR'),
    attrTitle('resilient', 'Resilient', `Reach ${CONST.ATTR_TIER_STARTS[1]} Vitality XP.`, 'VIT'),
    attrTitle('scholar', 'Analyst', `Reach ${CONST.ATTR_TIER_STARTS[1]} Intellect XP.`, 'INT'),
    attrTitle('keeneye', 'Observant', `Reach ${CONST.ATTR_TIER_STARTS[1]} Perception XP.`, 'PER'),
    attrTitle('silvertongue', 'Liaison', `Reach ${CONST.ATTR_TIER_STARTS[1]} Charisma XP.`, 'CHA'),
    T('versatile', 'Attribute', 'Versatile', `Balance your top two attributes (at least ${CONST.VERSATILE_MIN_XP} XP).`, 'people', 1, c => (c.versatile ? 1 : 0)),
    T('rank_d', 'Hunter Rank', 'D-Rank Hunter', 'Reach D-Rank.', 'arrowup', 1, c => c.rankIdx),
    T('rank_c', 'Hunter Rank', 'C-Rank Hunter', 'Reach C-Rank.', 'arrowup', 2, c => c.rankIdx),
    T('rank_b', 'Hunter Rank', 'B-Rank Hunter', 'Reach B-Rank.', 'arrowup', 3, c => c.rankIdx),
    T('rank_a', 'Hunter Rank', 'A-Rank Hunter', 'Reach A-Rank.', 'arrowup', 4, c => c.rankIdx),
    T('rank_s', 'Hunter Rank', 'S-Rank Hunter', 'Reach S-Rank.', 'crown', 5, c => c.rankIdx),
    T('chosen', 'Special', 'Mission Cleared', 'Clear a Daily Mission.', 'bolt', 1, c => c.dqDone),
    T('collector', 'Special', 'Archivist', 'Unlock 10 qualifications.', 'trophy', 10, c => c.achievements),
    T('apex', 'Level 100', 'Apex Hunter', 'Reach level 100.', 'crown', 100, c => c.level)
  ];
  const TITLE_CATS = ['Milestone', 'Continuity', 'Mastery', 'Attribute', 'Hunter Rank', 'Special', 'Level 100'];

  const C = (id, name, desc, icon, tone, reward, target, progress) => ({ id, name, desc, icon, tone, reward, target, progress });
  const CHALLENGES = [
    C('warmup', 'Warm-Up', 'Complete 25 check-ins.', 'target', '#3ab0c2', 40, 25, c => c.completions),
    C('ironweek', 'Seven-Day Run', 'Reach a 7-day continuity.', 'flame', '#b98a50', 60, 7, c => c.bestCombo),
    C('perfect5', 'Five Clean Days', 'Earn 5 perfect days.', 'check', '#5f9e7e', 75, 5, c => c.perfectDays),
    C('hundred', 'Hundred Entries', 'Complete 100 check-ins.', 'swords', '#b5575f', 120, 100, c => c.completions),
    C('cyber', 'Cognitive Operation', 'Complete 30 INT protocols.', 'book', '#8b7db3', 100, 30, c => c.attrDone.INT),
    C('bodyforge', 'Physical Conditioning', 'Complete 30 STR protocols.', 'dumbbell', '#b5575f', 100, 30, c => c.attrDone.STR),
    C('practice', 'Deliberate Practice', 'Log 20 skill sessions.', 'bolt', '#b99a5c', 60, 20, c => c.sessions),
    C('questtaker', 'Mission Run', 'Clear 3 Daily Missions.', 'trophy', '#3ab0c2', 90, 3, c => c.dqDone)
  ];

  const THEMES = [
    { id: 'default', name: 'Standard', desc: 'Graphite command terminal. The default display.', unlock: { type: 'free' }, accent: '#3ab0c2', edge: '#2d5566', hue: 0 },
    { id: 'shadow', name: 'Night Ops', desc: 'Low-signature red accent for night use.', unlock: { type: 'achievement', value: 'perfect10', label: 'Earn the Field Discipline qualification' }, accent: '#b5575f', edge: '#6e2f38', hue: 150 },
    { id: 'forest', name: 'Field Green', desc: 'Muted green accent for low-glare focus.', unlock: { type: 'hc', value: 250 }, accent: '#5f9e7e', edge: '#2f5f4c', hue: -60 },
    { id: 'sunset', name: 'Amber Terminal', desc: 'Amber phosphor accent.', unlock: { type: 'hc', value: 400 }, accent: '#b98a50', edge: '#6e4a2e', hue: 170 },
    { id: 'cyber', name: 'Violet Signal', desc: 'Violet accent for analyst-style review.', unlock: { type: 'challenge', value: 'cyber', label: 'Complete the Cognitive Operation' }, accent: '#8b7db3', edge: '#4a4470', hue: 70 },
    { id: 'minimal', name: 'Redacted Mono', desc: 'Monochrome steel with no color accent.', unlock: { type: 'hc', value: 350 }, accent: '#c4ccd6', edge: '#566069', hue: 0, sat: 0.15 },
    { id: 'royal', name: 'Brass', desc: 'Brushed-brass accent.', unlock: { type: 'level', value: 50, label: 'Reach Level 50' }, accent: '#c0a263', edge: '#6e5a30', hue: 190 },
    { id: 'galaxy', name: 'Deep Indigo', desc: 'Indigo accent for low-light use.', unlock: { type: 'streak', value: 30, label: 'Reach a 30-day continuity record' }, accent: '#7c78b0', edge: '#403d70', hue: 40 }
  ];

  /* ------------------------------------------------------------ unlocks, HC */
  function checkUnlocks(S, today) {
    const c = context(S, today), now = Date.now(), fresh = { achievements: [], titles: [], challenges: [] };
    // loop because unlocking an achievement can unlock a title (Collector) in the same pass
    for (let pass = 0; pass < 3; pass++) {
      let any = false;
      ACHIEVEMENTS.forEach(a => { if (!S.unlocked.achievements[a.id] && a.progress(c) >= a.target) { S.unlocked.achievements[a.id] = now; fresh.achievements.push(a); any = true; c.achievements++; } });
      CHALLENGES.forEach(a => { if (!S.unlocked.challenges[a.id] && a.progress(c) >= a.target) { S.unlocked.challenges[a.id] = now; fresh.challenges.push(a); any = true; } });
      TITLES.forEach(t => { if (!S.unlocked.titles[t.id] && t.progress(c) >= t.target) { S.unlocked.titles[t.id] = now; fresh.titles.push(t); any = true; c.titles++; } });
      if (!any) break;
    }
    if (!S.profile.equippedTitle && S.unlocked.titles.first) S.profile.equippedTitle = 'first';
    return { fresh, ctx: c };
  }
  function hcBalance(S) {
    let earned = 0;
    ACHIEVEMENTS.forEach(a => { if (S.unlocked.achievements[a.id]) earned += a.reward; });
    CHALLENGES.forEach(a => { if (S.unlocked.challenges[a.id]) earned += a.reward; });
    const spent = S.purchases.reduce((s, p) => s + p.cost, 0);
    return { earned, spent, balance: earned - spent };
  }
  function themeStatus(S, th, ctx) {
    const u = th.unlock;
    if (S.purchases.some(p => p.id === th.id) || u.type === 'free') return { owned: true };
    if (u.type === 'hc') return { owned: false, buy: true, cost: u.value };
    let ok = false;
    if (u.type === 'level') ok = ctx.level >= u.value;
    if (u.type === 'streak') ok = ctx.bestCombo >= u.value;
    if (u.type === 'achievement') ok = !!S.unlocked.achievements[u.value];
    if (u.type === 'challenge') ok = !!S.unlocked.challenges[u.value];
    return { owned: ok, locked: !ok, label: u.label };
  }

  /* ------------------------------------------------------------ Hunter License data (a VIEW of existing data) */
  function getHunterCardData(S, today) {
    const ctx = context(S, today), li = levelInfo(ctx.xp), rank = rankForLevel(li.level), cls = classInfo(ctx.attrXp);
    const mx = masteryXPMap(S);
    let best = null;
    S.habits.forEach(h => { const t = masteryTier(mx[h.id] || 0); if (!best || (mx[h.id] || 0) > best.xp) best = { habit: h.name, xp: mx[h.id] || 0, rank: t.name, tier: t.idx }; });
    const title = S.profile.equippedTitle && S.unlocked.titles[S.profile.equippedTitle] ? TITLES.find(t => t.id === S.profile.equippedTitle) : null;
    const attributes = {};
    ATTR_ORDER.forEach(a => { const t = attrTier(a, ctx.attrXp[a]); attributes[a] = { xp: ctx.attrXp[a], tier: t.name, tierNo: t.no, pct: t.pct, next: t.next, max: t.max }; });
    return {
      name: S.profile.name, hunterId: S.profile.hunterId, issuedDate: keyOf(new Date(S.profile.createdAt)),
      avatar: S.profile.avatar, level: li.level, xp: li.cur, xpNeed: li.need, xpPct: li.pct, maxLevel: li.max,
      rank: rank.id, rankColor: rank.color, rankTitle: rank.title,
      class: cls.name, primaryAttribute: cls.attr, versatile: cls.versatile,
      title: title ? title.name : null, attributes,
      highestMastery: best ? { rank: best.rank, habitName: best.habit, tier: best.tier } : { rank: MASTERY[0], habitName: '', tier: 0 }
    };
  }

  HA.Game = {
    CONST, RANKS, ATTRS, ATTR_ORDER, TIER_ROMAN, MASTERY, ACHIEVEMENTS, TITLES, TITLE_CATS, CHALLENGES, THEMES,
    keyOf, parseKey, addDays, todayKey, levelNeed, LEVEL_START, levelInfo, rankForLevel, rankStartXP, rankProgress, tierProgress, attrTier, masteryTier, classInfo,
    activeHabits, habitScheduledOn, scheduledHabits, dayRec, totalXP, attrXP, masteryXPMap, habitStats, refreshDay, processDays, toggleHabit,
    skillXP, practiceSkill, dqCanSchedule, dqSchedule, dqSetRepeat, dqStopRepeat, dqNextAt, TIME_RE, dqTick, dqAccept, dqDecline, context, checkUnlocks, hcBalance, themeStatus, getHunterCardData
  };
})(typeof self !== 'undefined' ? self : window);
