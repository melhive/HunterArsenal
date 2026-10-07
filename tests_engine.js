/* Run with: node tests_engine.js   (no dependencies) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const store = {};
const ctx = { console, crypto: require('crypto').webcrypto, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } } };
ctx.self = ctx; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['version', 'gamification', 'storage']) vm.runInContext(fs.readFileSync(path.join(__dirname, 'js', f + '.js'), 'utf8'), ctx, { filename: f });
const { Game: G, Store } = ctx.HA;
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
const mk = (id, attr, created) => ({ id, name: id, desc: '', icon: 'target', attr, days: null, created: created || '2026-01-01', archived: false });

// ---- levels & ranks: the Core Progression anchors
const A = { 1: 0, 13: 1500, 30: 6000, 50: 14000, 70: 25000, 90: 38000, 100: 48000 };
Object.entries(A).forEach(([L, xp]) => assert(G.LEVEL_START[L] === xp, `Lv ${L} starts at ${xp} XP`));
let mono = true; for (let L = 1; L < 100; L++) if (G.levelNeed(L) <= 0 || (L > 1 && G.levelNeed(L) < G.levelNeed(L - 1) - 1)) mono = false;
assert(mono, 'XP needed per level keeps rising (progression slows naturally; +-1 XP rounding allowed)');
assert(G.levelInfo(1499).level === 12 && G.levelInfo(1500).level === 13, 'E-Rank ends at Lv 12, D-Rank starts at Lv 13');
assert(G.rankForLevel(12).id === 'E' && G.rankForLevel(13).id === 'D' && G.rankForLevel(29).id === 'D' && G.rankForLevel(30).id === 'C' && G.rankForLevel(49).id === 'C' && G.rankForLevel(50).id === 'B' && G.rankForLevel(70).id === 'A' && G.rankForLevel(89).id === 'A' && G.rankForLevel(90).id === 'S' && G.rankForLevel(100).id === 'S', 'rank level ranges');
assert(G.levelInfo(1e9).level === 100 && G.levelInfo(1e9).max, 'max level 100');
assert(!G.RANKS.some(r => 'mult' in r), 'no rank multipliers');
const rp = G.rankProgress(6820); assert(rp.rank.id === 'C' && rp.next.id === 'B' && rp.nextXP === 14000, 'rank progress: C-Rank toward B at 14,000 XP');

// ---- attribute tiers 0/100/400/900/1600, flat XP
let t = G.attrTier('STR', 142); assert(t.name === 'Berserker' && t.no === 2 && t.next === 400 && t.base === 100, 'STR 142 XP = Berserker, tier II, next at 400');
assert(G.attrTier('STR', 99).name === 'Brawler' && G.attrTier('STR', 100).name === 'Berserker' && G.attrTier('STR', 100).pct === 0, 'bar resets to 0 at each new tier');
assert(G.attrTier('STR', 1600).max && G.attrTier('STR', 1600).name === 'Titan', '1600 XP = Titan (max)');
assert(G.attrTier('INT', 900).name === 'Sage' && G.attrTier('VIT', 400).name === 'Bastion' && G.attrTier('PER', 400).name === 'Pathfinder' && G.attrTier('CHA', 900).name === 'Commander', 'class names per image');
assert(G.masteryTier(0).name === 'INITIATED' && G.masteryTier(50).name === 'CALIBRATED' && G.masteryTier(150).name === 'PROFICIENT' && G.masteryTier(400).name === 'QUALIFIED' && G.masteryTier(1000).name === 'EXPERT' && G.masteryTier(2500).name === 'AUTHORITY' && G.MASTERY.length === 7, 'mastery ranks (7)');

// ---- one completion = +10 / +5 / +5
{ const S = Store.defaults(); const d = '2026-02-01'; S.habits.push(mk('a', 'STR', d)); S.streak.processed = '2026-01-31';
  const r = G.toggleHabit(S, 'a', d, 1); G.refreshDay(S, d);
  assert(r.xp === 10 && G.totalXP(S) === 10 && G.attrXP(S).STR === 5 && G.masteryXPMap(S).a === 5, 'one habit = +10 Hunter XP, +5 STR XP, +5 mastery XP');
  assert(G.toggleHabit(S, 'a', d, 2).done === false && G.totalXP(S) === 0, 'tapping again undoes it (one completion per habit per day)');
  G.toggleHabit(S, 'a', d, 3); S.habits[0].attr = 'INT'; G.toggleHabit(S, 'a', G.addDays(d, 1), 4);
  assert(G.attrXP(S).STR === 5 && G.attrXP(S).INT === 5, 'changing attribute only affects future XP');
  S.habits[0].archived = true; assert(G.toggleHabit(S, 'a', G.addDays(d, 2), 5) === null && G.masteryXPMap(S).a === 10, 'archived habits give no XP but keep mastery');
  S.habits[0].archived = false; const before = G.totalXP(S); S.habits = []; assert(G.totalXP(S) === before, 'deleting a habit never removes earned XP'); }

// ---- daily XP cap: 8 habits x 10 + daily quest 25 = 105
{ const S = Store.defaults(), d = '2026-03-01'; for (let i = 0; i < 8; i++) S.habits.push(mk('h' + i, G.ATTR_ORDER[i % 5], d)); S.streak.processed = '2026-02-28';
  S.habits.forEach(h => G.toggleHabit(S, h.id, d, 1)); G.dqSchedule(S, 1); G.dqTick(S, 2); G.dqAccept(S, d); G.refreshDay(S, d);
  assert(G.totalXP(S) === 105, 'maximum daily Hunter XP is 105'); }
// ---- a year of maximum effort reaches ~Lv 90; a typical 5-habit user reaches ~Lv 60
function sim(n, dq, days) { const S = Store.defaults(), start = '2026-01-01'; S.streak.processed = G.addDays(start, -1); for (let i = 0; i < n; i++) S.habits.push(mk('h' + i, G.ATTR_ORDER[i % 5], start));
  for (let k = 0; k < days; k++) { const d = G.addDays(start, k); G.processDays(S, d); if (dq) { G.dqSchedule(S, 1); G.dqTick(S, 2); G.dqAccept(S, d); } S.habits.forEach(h => G.toggleHabit(S, h.id, d, 1)); G.refreshDay(S, d); } return G.levelInfo(G.totalXP(S)); }
const maxy = sim(8, true, 365), typ = sim(5, false, 365), mid = sim(8, false, 365);
console.log(`365 days: 8 habits + Daily Quest -> Lv ${maxy.level} (${maxy.total} XP) | 8 habits, no quest -> Lv ${mid.level} | 5 habits -> Lv ${typ.level}`);
assert(maxy.level >= 89 && maxy.level <= 91, 'maximum effort for a year lands on Lv ~90 (S-Rank)');

// ---- versatility
let c = G.classInfo({ STR: 400, VIT: 380, INT: 0, PER: 0, CHA: 0 }); assert(c.versatile && c.attr === 'STR', 'versatile when runner-up within 10%');
c = G.classInfo({ STR: 400, VIT: 200, INT: 0, PER: 0, CHA: 0 }); assert(!c.versatile, 'not versatile with a big gap');
c = G.classInfo({ STR: 60, VIT: 60, INT: 0, PER: 0, CHA: 0 }); assert(!c.versatile, 'not versatile below tier II');
c = G.classInfo({ STR: 0, VIT: 0, INT: 0, PER: 0, CHA: 0 }); assert(!c.versatile && c.name === 'Brawler', 'empty state -> Brawler');

// ---- hostile import is neutralised
const evil = { app: 'HunterArsenal', data: { habits: Array.from({ length: 12 }, (_, i) => ({ id: 'x' + i, name: '<img src=x onerror=alert(1)>', attr: 'HAX', icon: '../../x', days: [9, -1] })), completions: { '2026-01-01': { x0: { xp: 999999, ax: 1e9, attr: 'STR' } } }, profile: { name: 'A'.repeat(500), avatar: 'javascript:alert(1)' }, unlocked: { titles: { nope: 1 } }, settings: { theme: '<script>' } } };
const clean = Store.importJSON(JSON.stringify(evil));
assert(clean.habits[0].attr === 'STR' && clean.habits[0].icon === 'target', 'hostile habit fields sanitised');
assert(clean.habits.filter(h => !h.archived).length === 8, 'more than 8 active habits are capped at 8');
assert(clean.completions['2026-01-01'].x0.xp === 10 && clean.completions['2026-01-01'].x0.ax === 5, 'tampered XP values are reset to the fixed amounts');
assert(clean.profile.name.length === 24 && clean.profile.avatar === null && clean.settings.theme === 'default' && !clean.unlocked.titles.nope, 'profile/theme/unlock ids sanitised');
store['hunterarsenal.v2'] = JSON.stringify({ habits: [{ id: 'old', name: 'Old', attr: 'INT', diff: 'hard' }], completions: { '2026-01-01': { old: { xp: 15, base: 15, attr: 'INT' } } } });
const mig = Store.load(); assert(mig.habits[0].id === 'old' && G.totalXP(mig) === 10 && store['hunterarsenal.v3'], 'v2 data migrates to flat XP and is saved under the v3 key');

// ---- Daily Quest cycle
{ const S = Store.defaults(), d = '2026-02-02'; S.habits.push(mk('a', 'STR', '2026-02-01')); S.streak.processed = '2026-02-01';
  G.dqSchedule(S, 1000); assert(!G.dqTick(S, 999) && G.dqTick(S, 1000) && S.dailyQuest.state === 'available', 'quest becomes available at the scheduled time');
  G.dqAccept(S, d); G.toggleHabit(S, 'a', d, 1); const ev = G.refreshDay(S, d); assert(ev.dqCompleted && S.days[d].dq === 25 && G.totalXP(S) === 35, 'clearing it gives +25 Hunter XP only');
  assert(G.attrXP(S).STR === 5 && G.masteryXPMap(S).a === 5, 'Daily Quest adds no attribute or mastery XP');
  assert(G.dqCanSchedule(S), 'another cycle can be scheduled'); G.dqSchedule(S, 5000); assert(S.dailyQuest.state === 'scheduled', 'cycle 2 scheduled (repeatable)');
  G.dqTick(S, 6000); G.dqAccept(S, '2026-02-03'); G.processDays(S, '2026-02-05'); assert(S.dailyQuest.state === 'failed', 'quest fails if the day ends uncleared'); }
// ---- freeze + penalty (Hunter XP only)
{ const S = Store.defaults(); S.settings.penalties = true; S.habits.push(mk('a', 'STR', '2026-03-01')); S.streak.processed = '2026-02-28'; S.streak.freezes = 1; S.streak.combo = 5;
  G.processDays(S, '2026-03-03'); assert(S.streak.freezes === 0 && S.days['2026-03-01'].frozen && S.days['2026-03-02'].penalty === 5 && S.streak.combo === 0, 'freeze excuses the first miss; the second resets the streak and costs 5 Hunter XP');
  assert(G.attrXP(S).STR === 0 && Object.keys(G.masteryXPMap(S)).length === 0, 'penalties never touch attribute or mastery XP'); }
// ---- unlocks & card
{ const S = Store.defaults(), d = '2026-04-01'; S.habits.push(mk('a', 'STR', d)); S.streak.processed = '2026-03-31';
  G.toggleHabit(S, 'a', d, Date.parse(d + 'T04:00:00')); G.refreshDay(S, d); const u = G.checkUnlocks(S, d);
  assert(S.unlocked.titles.first && S.profile.equippedTitle === 'first' && u.fresh.achievements.some(a => a.id === 'first_step'), 'first check-in unlocks First Blood and auto-equips it');
  const card = G.getHunterCardData(S, d); assert(card.level === 1 && card.rank === 'E' && card.rankTitle === 'Provisional Hunter' && card.hunterId.startsWith('HA-'), 'Hunter Card data comes from the single source'); }
assert(G.ACHIEVEMENTS.length === 25, '25 achievements'); assert(G.TITLES.length === 28 && new Set(G.TITLES.map(x => x.id)).size === 28, '28 titles, unique ids');
// ---- Daily Mission repeat (a fixed time every day)
{ const S = Store.defaults(), at = new Date(2026, 5, 10, 7, 0, 0).getTime();            // 10 Jun 07:00 local
  assert(!G.dqSetRepeat(S, '25:99', at) && S.dailyQuest.repeat === null, 'invalid time is rejected');
  assert(G.dqSetRepeat(S, '08:30', at) && S.dailyQuest.state === 'scheduled' && S.dailyQuest.at === new Date(2026, 5, 10, 8, 30).getTime(), 'repeat arms today when the time is still ahead');
  const S2 = Store.defaults(), late = new Date(2026, 5, 10, 9, 0).getTime(); G.dqSetRepeat(S2, '08:30', late);
  assert(S2.dailyQuest.at === new Date(2026, 5, 11, 8, 30).getTime(), 'repeat arms tomorrow when the time has passed');
  S.habits.push(mk('a', 'STR', '2026-06-01')); S.streak.processed = '2026-06-09';
  G.dqTick(S, new Date(2026, 5, 10, 8, 31).getTime()); assert(S.dailyQuest.state === 'available', 'becomes available at the time');
  G.dqAccept(S, '2026-06-10'); G.toggleHabit(S, 'a', '2026-06-10', 1); G.refreshDay(S, '2026-06-10');
  assert(S.dailyQuest.state === 'completed', 'cleared');
  G.dqTick(S, new Date(2026, 5, 10, 20, 0).getTime()); assert(S.dailyQuest.state === 'completed', 'a cleared mission waits for the day to end (un-ticking can still revert it)');
  G.dqTick(S, new Date(2026, 5, 11, 0, 5).getTime()); assert(S.dailyQuest.state === 'scheduled' && S.dailyQuest.at === new Date(2026, 5, 11, 8, 30).getTime(), 'next day re-arms itself, no manual scheduling');
  G.dqTick(S, new Date(2026, 5, 11, 8, 30).getTime()); G.dqDecline(S); G.dqTick(S, new Date(2026, 5, 11, 9, 0).getTime());
  assert(S.dailyQuest.state === 'scheduled' && S.dailyQuest.at === new Date(2026, 5, 12, 8, 30).getTime(), 'declined mission also re-arms for tomorrow');
  G.dqStopRepeat(S); assert(S.dailyQuest.repeat === null && S.dailyQuest.state === 'none', 'turning repeat off clears the schedule');
  const R = Store.sanitize ? Store.sanitize({ dailyQuest: { state: 'none', repeat: '07:15' } }) : null; if (R) assert(R.dailyQuest.repeat === '07:15', 'repeat survives save/load'); }

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exitCode = fails ? 1 : 0;
