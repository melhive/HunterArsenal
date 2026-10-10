/* Run with: node tests_engine.js   (no dependencies) */
const fs = require('fs'), vm = require('vm'), path = require('path'), { TextEncoder, TextDecoder } = require('util');
const store = {};
const ctx = { console, crypto: require('crypto').webcrypto, TextEncoder, TextDecoder, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } } };
ctx.self = ctx; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['version', 'gamification', 'storage']) vm.runInContext(fs.readFileSync(path.join(__dirname, 'js', f + '.js'), 'utf8'), ctx, { filename: f });
const { Game: G, Store } = ctx.HA;
const securityCtx = { console, crypto: require('crypto').webcrypto, TextEncoder, TextDecoder, document: { addEventListener() {} }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, addEventListener() {} };
securityCtx.self = securityCtx; securityCtx.window = securityCtx; vm.createContext(securityCtx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'js', 'security.js'), 'utf8'), securityCtx, { filename: 'security' });
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
const asyncChecks = [];
const mk = (id, attr, created) => ({ id, name: id, desc: '', icon: 'target', attr, days: null, created: created || '2026-01-01', archived: false });
function isolatedStore(initial = {}, sharedData = null) {
  const data = sharedData || { ...initial }, flags = { failGet: false, failSet: false, failRemove: false, failGetOnCall: 0, failSetOnCall: 0, replaceOnGetCall: 0, replaceValue: null, getCalls: 0, setCalls: 0,
    failNextGetKey: null, failNextSetKey: null, quotaSetKey: null, writeThenThrowKey: null, failNextRemoveKey: null, failNextSetAfterReadbackKey: null, failGetKeyOccurrence: {}, failSetKeyOccurrence: {}, getKeyCounts: {}, setKeyCounts: {}, failReadbackAfterSetKey: null, failReadbackArmed: false, readbackMismatchAfterSetKey: null, readbackMismatchArmed: false, readbackMismatchValue: null, injectedFailures: [], operations: [], captureAfterSetKey: null, captureAfterReadbackKey: null, captureAfterRemoveKey: null, captureArmed: false, capturedData: null };
  const capture = (phase, key) => { flags.injectedFailures.push({ phase, key }); flags.capturedData = { ...data }; };
  const c = { console: { warn() {} }, crypto: require('crypto').webcrypto, TextEncoder, TextDecoder, localStorage: {
    getItem(k) { flags.getCalls++; flags.getKeyCounts[k] = (flags.getKeyCounts[k] || 0) + 1; flags.operations.push({ op: 'get', key: k });
      if (flags.replaceOnGetCall === flags.getCalls) data[k] = flags.replaceValue;
      if (flags.failGet || flags.failGetOnCall === flags.getCalls || flags.failNextGetKey === k || flags.failGetKeyOccurrence[k] === flags.getKeyCounts[k] || (flags.failReadbackAfterSetKey === k && flags.failReadbackArmed)) {
        if (flags.failNextGetKey === k) flags.failNextGetKey = null;
        if (flags.failReadbackAfterSetKey === k && flags.failReadbackArmed) { flags.injectedFailures.push({ phase: 'readback', key: k }); flags.failReadbackAfterSetKey = null; flags.failReadbackArmed = false; if (flags.failNextSetAfterReadbackKey === k) flags.failNextSetKey = k; }
        throw new Error(`read blocked: ${k}`);
      }
      if (flags.readbackMismatchAfterSetKey === k && flags.readbackMismatchArmed) { flags.readbackMismatchArmed = false; flags.readbackMismatchAfterSetKey = null; data[k] = flags.readbackMismatchValue; }
      const value = Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
      if (flags.captureAfterReadbackKey === k && flags.captureArmed) { flags.captureArmed = false; capture('readback', k); }
      return value; },
    setItem(k, v) { flags.setCalls++; flags.setKeyCounts[k] = (flags.setKeyCounts[k] || 0) + 1; flags.operations.push({ op: 'set', key: k });
      if (flags.quotaSetKey === k) { flags.injectedFailures.push({ phase: 'quota', key: k }); const e = new Error(`quota exceeded: ${k}`); e.name = 'QuotaExceededError'; throw e; }
      if (flags.failSet || flags.failSetOnCall === flags.setCalls || flags.failNextSetKey === k || flags.failSetKeyOccurrence[k] === flags.setKeyCounts[k]) { if (flags.failNextSetKey === k) flags.failNextSetKey = null; flags.injectedFailures.push({ phase: 'write', key: k }); throw new Error(`write blocked: ${k}`); }
      data[k] = String(v); if (flags.writeThenThrowKey === k) { flags.writeThenThrowKey = null; flags.injectedFailures.push({ phase: 'partial-write', key: k }); throw new Error(`write stored then threw: ${k}`); }
      if (flags.failReadbackAfterSetKey === k) flags.failReadbackArmed = true; if (flags.readbackMismatchAfterSetKey === k) flags.readbackMismatchArmed = true;
      if (flags.captureAfterSetKey === k) capture('write', k);
      if (flags.captureAfterReadbackKey === k) flags.captureArmed = true; },
    removeItem(k) { flags.operations.push({ op: 'remove', key: k }); if (flags.failRemove || flags.failNextRemoveKey === k) { if (flags.failNextRemoveKey === k) flags.failNextRemoveKey = null; throw new Error(`remove blocked: ${k}`); } delete data[k]; if (flags.captureAfterRemoveKey === k) capture('remove', k); }
  } };
  c.self = c; c.window = c; vm.createContext(c);
  for (const f of ['version', 'gamification', 'storage']) vm.runInContext(fs.readFileSync(path.join(__dirname, 'js', f + '.js'), 'utf8'), c, { filename: `isolated-${f}` });
  return { c, data, flags, Store: c.HA.Store, Game: c.HA.Game };
}
assert(Store.defaults().v===4&&Store.defaults().settings.penalties===true&&Store.defaults().settings.autoFreeze===true,'v2.4 defaults enable penalties and automatic Streak Freeze');

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

// ---- attribute tiers 50/100/400/900/1600, flat XP
let t = G.attrTier('STR', 142); assert(t.name === 'Berserker' && t.no === 2 && t.next === 400 && t.base === 100, 'STR 142 XP = Berserker, tier II, next at 400');
assert(G.attrTier('STR', 0).idx === -1 && G.attrTier('STR', 0).noClass && G.attrTier('STR', 0).name === 'NO CLASS' && G.attrTier('STR', 49).idx === -1, 'STR at zero has no class; below 50 remains before the specific Tier I class');
assert(G.attrTier('STR', 1).name === 'AWAKENING' && G.attrTier('STR', 1).awakening && G.attrTier('STR', 49).name === 'AWAKENING' && G.attrTier('STR', 32).next === 50, 'first earned Attribute XP unlocks AWAKENING through 49 XP');
assert(G.attrTier('STR', 50).name === 'Brawler' && G.attrTier('STR', 50).idx === 0 && G.attrTier('STR', 99).name === 'Brawler' && G.attrTier('STR', 100).name === 'Berserker' && G.attrTier('STR', 100).pct === 0, 'STR first class starts at 50 XP and tier II remains at 100 XP');
assert(G.CONST.ATTR_TIER_STARTS.join(',') === '50,100,400,900,1600', 'only tier I threshold changed; all later Attribute thresholds remain unchanged');
{ const S = Store.defaults(), ax = G.attrXP(S); assert(G.ATTR_ORDER.every(a => ax[a] === 0 && G.attrTier(a, ax[a]).idx === -1), 'new users begin with zero Attribute XP and no achieved classes'); }
for (const a of G.ATTR_ORDER) {
  assert(G.attrTier(a, 0).noClass && G.attrTier(a, 1).name === 'AWAKENING' && G.attrTier(a, 49).name === 'AWAKENING' && G.attrTier(a, 50).idx === 0 && G.attrTier(a, 99).idx === 0 && G.attrTier(a, 100).idx === 1, `${a} follows 0 no class, 1–49 Awakening, 50 tier I, 100 tier II`);
}
assert(G.newAttributeClassUnlocks({ STR: 0 }, { STR: 0 }).length === 0 && G.newAttributeClassUnlocks({ STR: 0 }, { STR: 1 }).map(x => x.name).join() === 'AWAKENING' && G.newAttributeClassUnlocks({ STR: 1 }, { STR: 49 }).length === 0, 'AWAKENING notification fires on first XP only');
assert(G.newAttributeClassUnlocks({ STR: 0 }, { STR: 49 }).map(x => x.name).join() === 'AWAKENING' && G.newAttributeClassUnlocks({ STR: 49 }, { STR: 50 }).map(x => `${x.idx}:${x.name}`).join() === '0:Brawler', 'class achievement events fire only when Awakening or Tier I is crossed');
assert(G.newAttributeClassUnlocks({ STR: 50 }, { STR: 50 }).length === 0 && G.newAttributeClassUnlocks({ STR: 50 }, { STR: 99 }).length === 0 && G.newAttributeClassUnlocks({ STR: 99 }, { STR: 100 }).map(x => `${x.idx}:${x.name}`).join() === '1:Berserker', 'no repeated notice without a new class; tier II event fires at 100 XP');
assert(G.newAttributeClassUnlocks({ STR: 0 }, { STR: 110 }).map(x => x.name).join() === 'AWAKENING,Brawler,Berserker' && G.newAttributeClassUnlocks({ STR: 40 }, { STR: 110 }).map(x => x.idx).join() === '0,1', 'crossing multiple Attribute thresholds reports every newly unlocked class once');
const overviewXp = { STR: 150, INT: 100, VIT: 75, PER: 32, CHA: 8 };
assert(G.sortAttributesByXP(overviewXp).join() === 'STR,INT,VIT,PER,CHA', 'Attribute Overview sort orders current XP descending');
assert(G.sortAttributesByXP({ ...overviewXp, INT: 180 }).join() === 'INT,STR,VIT,PER,CHA', 'Attribute Overview order updates when XP changes');
assert(G.sortAttributesByXP({ ...overviewXp, INT: 180, PER: 200 }).join() === 'PER,INT,STR,VIT,CHA', 'highest XP Attribute moves to the top dynamically');
assert(G.sortAttributesByXP({ STR: 0, VIT: 0, INT: 0, PER: 0, CHA: 0 }).join() === 'STR,VIT,INT,PER,CHA', 'equal XP keeps the fixed STR/VIT/INT/PER/CHA order');
assert(G.sortAttributesByXP({ STR: 50, INT: 50, VIT: 25, PER: 10, CHA: 10 }).join() === 'STR,INT,VIT,PER,CHA', 'equal-XP ties use fixed attribute order');
assert(G.sortAttributesByXP(overviewXp).map(a => `${a}:${overviewXp[a]}`).join('|') === 'STR:150|INT:100|VIT:75|PER:32|CHA:8', 'sorting preserves each Attribute ID and its XP association');
assert(G.attrTier('STR', 1600).max && G.attrTier('STR', 1600).name === 'Titan', '1600 XP = Titan (max)');
assert(G.attrTier('INT', 900).name === 'Sage' && G.attrTier('VIT', 400).name === 'Bastion' && G.attrTier('PER', 400).name === 'Pathfinder' && G.attrTier('CHA', 900).name === 'Commander', 'class names per image');
assert([0,50,150,400,700,1000,2500].every((xp,i)=>G.masteryTier(xp).name===G.MASTERY[i]) && G.MASTERY.join('|')==='Awakened|Forged|Hunter|Veteran|Elite|Apex|Ascendant', 'seven Habit Mastery names and locked thresholds');
assert(Object.keys(G.LEGACY_MASTERY).length===7 && Object.values(G.LEGACY_MASTERY).join('|')===G.MASTERY.join('|'), 'positional migration of all seven legacy mastery names');

// ---- one completion = +10 / +5 / +5
{ const S = Store.defaults(); const d = '2026-02-01'; S.habits.push(mk('a', 'STR', d)); S.streak.processed = '2026-01-31';
  const r = G.toggleHabit(S, 'a', d, 1); G.refreshDay(S, d);
  assert(r.xp === 10 && G.totalXP(S) === 10 && G.attrXP(S).STR === 5 && G.masteryXPMap(S).a === 5, 'one habit = +10 Hunter XP, +5 STR XP, +5 mastery XP');
  assert(JSON.stringify(G.attrXP(S))===JSON.stringify(G.context(S,d).attrXp),'Home, Profile and Statistics attribute XP derive from the same completion totals');
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
c = G.classInfo({ STR: 0, VIT: 0, INT: 0, PER: 0, CHA: 0 }); assert(!c.versatile && c.name === 'NO CLASS', 'empty state has no default Attribute Class');
{ const eq=G.normalizeAttrDistribution({STR:5,VIT:5,INT:5,PER:5,CHA:5}); assert(G.ATTR_ORDER.every(a=>eq[a]===1),'equal attributes normalize to a balanced outer pentagon'); }
{ const v=G.normalizeAttrDistribution({STR:10,VIT:5,INT:5,PER:5,CHA:5}); assert(v.STR===1&&v.VIT===.5&&v.INT===.5&&v.PER===.5&&v.CHA===.5,'STR-dominant distribution normalizes against the current maximum'); }
{ const v=G.normalizeAttrDistribution({STR:400,VIT:200,INT:800,PER:100,CHA:300}),expected={STR:.5,VIT:.25,INT:1,PER:.125,CHA:.375}; assert(G.ATTR_ORDER.every(a=>v[a]===expected[a]),'INT-dominant distribution preserves relative proportions'); }
{ const v=G.normalizeAttrDistribution({STR:0,VIT:0,INT:0,PER:0,CHA:0}); assert(G.ATTR_ORDER.every(a=>v[a]===0&&Number.isFinite(v[a])),'zero attributes remain centered without division by zero'); }

// ---- hostile import is rejected before normalization can discard or rewrite data
const evil = { app: 'HunterArsenal', data: { habits: Array.from({ length: 12 }, (_, i) => ({ id: 'x' + i, name: '<img src=x onerror=alert(1)>', attr: 'HAX', icon: '../../x', days: [9, -1] })), completions: { '2026-01-01': { x0: { xp: 999999, ax: 1e9, attr: 'STR' } } }, profile: { name: 'A'.repeat(500), avatar: 'javascript:alert(1)' }, unlocked: { titles: { nope: 1 } }, settings: { theme: '<script>' } } };
let evilRejected = false; try { Store.importJSON(JSON.stringify(evil)); } catch (e) { evilRejected = true; }
assert(evilRejected, 'hostile or incomplete backup is rejected instead of silently normalized');
{const legacy=Store.defaults();legacy.v=3;legacy.profile.name='Existing Hunter';legacy.profile.equippedTitle='first';legacy.profile.hunterId='HA-ABCD-EFGH';legacy.settings.theme='forest';legacy.settings.sound=true;legacy.settings.penalties=false;legacy.dailyQuest.state='scheduled';legacy.dailyQuest.repeat='07:15';legacy.streak.freezes=3;legacy.streak.combo=12;legacy.streak.best=20;legacy.streak.processed='2026-01-01';legacy.purchases=[{id:'forest',cost:250,at:5}];delete legacy.streak.milestones;const state=Store.importJSON(JSON.stringify({app:'HunterArsenal',data:legacy}));assert(state.profile.name==='Existing Hunter'&&state.settings.theme==='forest'&&state.settings.sound&&!state.settings.penalties&&state.settings.autoFreeze&&state.dailyQuest.repeat==='07:15'&&state.streak.freezes===3&&state.purchases.some(p=>p.id==='forest'),'v3 migration preserves profile, user-selected penalties, mission schedule, freeze bank, and HC purchase');}
{const C=Store.defaults();C.settings.border='border-cyan';C.settings.namePlate='plate-elite';C.purchases=[{id:'border-cyan',cost:180,at:1},{id:'plate-elite',cost:240,at:2}];const state=Store.importJSON(JSON.stringify({app:'HunterArsenal',data:C}));assert(state.settings.border==='border-cyan'&&state.settings.namePlate==='plate-elite'&&G.hcBalance(state).spent===420,'cosmetic ownership and equipped items survive validated normalization');}
const legacyV2=Store.defaults();delete legacyV2.v;legacyV2.habits=[mk('old','INT')];legacyV2.completions={'2026-01-01':{old:{xp:10,base:10,attr:'INT',at:1}}};
store['hunterarsenal.v2'] = JSON.stringify(legacyV2);
const mig = Store.load(); assert(mig.habits[0].id === 'old' && G.totalXP(mig) === 10 && store['hunterarsenal.v3'], 'complete v2 data migrates and is saved under the current key');

// ---- fail-safe storage, recovery, imports, migration, and explicit reset
{
  const x = isolatedStore(), fresh = x.Store.load();
  assert(fresh && fresh.v === 4 && !x.Store.isRecoveryRequired() && !x.data['hunterarsenal.v3'], 'no saved data produces in-memory defaults without recovery');
  assert(x.Store.save(fresh) && x.data['hunterarsenal.v3'] && x.data['hunterarsenal.install.v1'] === 'initialized', 'a valid initial state and verified installation marker are saved');
  fresh.profile.name = 'Existing Hunter'; fresh.habits.push(vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(mk('saved', 'INT')))})`, x.c)); fresh.streak.combo = 9;
  assert(x.Store.save(fresh), 'valid candidate save succeeds');
  const loaded = x.Store.load();
  assert(loaded.profile.name === 'Existing Hunter' && loaded.habits[0].id === 'saved' && loaded.streak.combo === 9, 'valid existing progress survives load/save');
  loaded.habits.push(vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(mk('active', 'STR')))})`, x.c));
  x.Game.toggleHabit(loaded, 'active', '2026-10-08', Date.now()); x.Game.refreshDay(loaded, '2026-10-08');
  assert(x.Store.save(loaded), 'ordinary habit completion and its daily record pass current-schema validation');
}
{
  const x = isolatedStore(), S = x.Store.load();
  assert(x.Store.save(S), 'initial marker test state is committed');
  delete x.data['hunterarsenal.v3'];
  const restarted = isolatedStore(x.data);
  assert(restarted.Store.load() === null && restarted.Store.isRecoveryRequired() && restarted.Store.recoveryInfo().reason === 'missing-saved-record', 'missing state after initialization enters recovery instead of returning defaults');
  assert(restarted.data['hunterarsenal.install.v1'] === 'initialized', 'missing-state recovery preserves the installation marker');
}
{
  const state = Store.defaults(); state.profile.name = 'Existing v4 Hunter';
  const x = isolatedStore({ 'hunterarsenal.v3': JSON.stringify(state) });
  const loaded = x.Store.load();
  assert(loaded && loaded.profile.name === 'Existing v4 Hunter' && x.data['hunterarsenal.install.v1'] === 'initialized', 'existing valid v4 state adopts the marker without replacing its progress');
}
{
  const state = Store.defaults(); state.profile.name = 'Marker Integrity';
  const raw = JSON.stringify(state), x = isolatedStore({ 'hunterarsenal.v3': raw, 'hunterarsenal.install.v1': 'future-marker' });
  assert(x.Store.load() === null && x.Store.isRecoveryRequired() && x.data['hunterarsenal.v3'] === raw && x.data['hunterarsenal.install.v1'] === 'future-marker', 'malformed or unsupported initialization marker enters recovery without modifying valid progress');
  const noState = isolatedStore({ 'hunterarsenal.install.v1': 'future-marker' });
  assert(noState.Store.load() === null && noState.Store.isRecoveryRequired(), 'unsupported marker with missing state is not treated as a new installation');
}
asyncChecks.push(Promise.all([
  Store.requestPersistentStorage({ persist: async () => true }),
  Store.requestPersistentStorage({ persist: async () => false }),
  Store.requestPersistentStorage(null),
  Store.requestPersistentStorage({ persist: async () => { throw new Error('permission request rejected'); } })
]).then(results => {
  assert(results.join('|') === 'granted|denied|unavailable|unavailable', 'persistent storage grant, denial, absence, and rejection are reported distinctly');
}));
{
  const sec = securityCtx.HA.Security._test, code = sec.makeResetCode();
  assert(/^\d{5}$/.test(code), 'reset confirmation generates a five-digit code');
  assert(sec.resetCodeMatches(code, code), 'correct reset confirmation code is accepted');
  assert(!sec.resetCodeMatches(code, '00000') && !sec.resetCodeMatches(code, ''), 'incorrect and empty reset confirmation codes are rejected');
  assert(!sec.resetCodeMatches(code, null), 'dismissed or cancelled reset confirmation cannot validate');
  const appSource = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
  const securitySource = fs.readFileSync(path.join(__dirname, 'js', 'security.js'), 'utf8');
  assert(appSource.includes('confirmed = await HA.Security.confirmDataReset()') && appSource.includes('if (!confirmed)') && securitySource.includes('if (!(await confirmDataReset())) return;'), 'normal and App Lock recovery resets both require explicit five-digit confirmation');
  assert(securitySource.includes("if (e.key === 'Escape') { e.stopPropagation(); done(null); }") && securitySource.includes("b.dataset.sx === 'ok' ? go() : done(null)"), 'cancel and dismissal resolve without confirmation');
  const appResetFn = appSource.match(/async function resetAll\(\) \{[\s\S]*?\n\}/)[0];
  const forgotFn = securitySource.match(/async function forgot\(\) \{[\s\S]*?\n  \}/)[0];
  function makeAppResetRoute(confirm) {
    const deps = { confirms: 0, resets: 0, notice: null, state: { profile: { name: 'Saved' } }, resetResult: true };
    deps.HA = { Security: { async confirmDataReset() { deps.confirms++; return typeof confirm === 'function' ? confirm() : confirm; } } };
    deps.Store = { reset() { deps.resets++; return deps.resetResult ? { ok: true, state: { profile: { name: 'Reset' } } } : { ok: false, state: null }; } };
    deps.Notice = { show(n) { deps.notice = n; } };
    const c = { deps }; vm.createContext(c);
    vm.runInContext(`const HA=deps.HA, Store=deps.Store, Notice=deps.Notice; let S=deps.state, lastSavedState=deps.state, ob=null, view='settings', homeTab='today', bonusSub=null, profileSub=null, resetFlowPending=false; const applyTheme=()=>{}, render=()=>{}, openOnboarding=()=>{}; ${appResetFn}; globalThis.invoke=resetAll; globalThis.inspect=()=>({S,resetFlowPending});`, c);
    return { c, deps };
  }
  function makeForgotRoute({ firstAsk, confirm, resetResult = true }) {
    const deps = { asks: 0, confirms: 0, resets: 0, cfgClears: 0, reloads: 0, notifications: 0, resetResult };
    const c = { deps }; vm.createContext(c);
    vm.runInContext(`const HA={Store:{reset(){deps.resets++;return deps.resetResult?{ok:true,state:{}}:{ok:false,state:null}}}}, g={location:{reload(){deps.reloads++}}}; let forgotPending=false; const ask=async()=>{deps.asks++;return deps.firstAsk()}, confirmDataReset=async()=>{deps.confirms++;return deps.confirm()}, putCfg=x=>{if(x===null)deps.cfgClears++;return true}, notify=async()=>{deps.notifications++}; ${forgotFn}; globalThis.invoke=forgot;`, Object.assign(c, { deps: Object.assign(deps, { firstAsk, confirm }) }));
    return { c, deps };
  }
  asyncChecks.push((async () => {
    const cancel = makeAppResetRoute(false); await cancel.c.invoke(); assert(cancel.deps.confirms === 1 && cancel.deps.resets === 0 && !cancel.deps.notice, 'normal reset handler cancellation never reaches Store.reset');
    let release; const pending = makeAppResetRoute(() => new Promise(r => { release = r; })); const first = pending.c.invoke(); await pending.c.invoke(); assert(pending.deps.confirms === 1 && pending.deps.resets === 0, 'repeated normal reset invocation is gated while code confirmation is pending'); release(true); await first; await pending.c.invoke(); assert(pending.deps.confirms === 1, 'normal reset remains gated until final confirmation is resolved'); pending.deps.notice.secondary.onClick(); assert(pending.deps.resets === 0 && !pending.c.inspect().resetFlowPending, 'final reset cancellation and dismissal release the guard without erasing');
    const success = makeAppResetRoute(true); await success.c.invoke(); success.deps.notice.primary.onClick(); success.deps.notice.primary.onClick(); assert(success.deps.confirms === 1 && success.deps.resets === 1 && success.c.inspect().S.profile.name === 'Reset', 'normal reset executes once only after fresh code confirmation and final user confirmation');
    const failed = makeAppResetRoute(true); failed.deps.resetResult = false; await failed.c.invoke(); failed.deps.notice.primary.onClick(); assert(failed.deps.resets === 1 && failed.c.inspect().S.profile.name === 'Saved', 'normal reset write failure leaves current app state unchanged');

    const forgottenCancel = makeForgotRoute({ firstAsk: async () => null, confirm: async () => true }); await forgottenCancel.c.invoke(); assert(forgottenCancel.deps.asks === 1 && forgottenCancel.deps.confirms === 0 && forgottenCancel.deps.resets === 0, 'App Lock forgotten-passcode dismissal does not reset data');
    const forgottenWrong = makeForgotRoute({ firstAsk: async () => ({ w: 'ERASE' }), confirm: async () => false }); await forgottenWrong.c.invoke(); assert(forgottenWrong.deps.confirms === 1 && forgottenWrong.deps.resets === 0, 'App Lock forgotten-passcode route requires the fresh code after ERASE text');
    let releaseAsk; const forgottenRepeat = makeForgotRoute({ firstAsk: () => new Promise(r => { releaseAsk = r; }), confirm: async () => true }); const f1 = forgottenRepeat.c.invoke(); await forgottenRepeat.c.invoke(); assert(forgottenRepeat.deps.asks === 1 && forgottenRepeat.deps.resets === 0, 'repeated App Lock recovery invocation is gated during its prompt'); releaseAsk(null); await f1; assert(forgottenRepeat.deps.resets === 0, 'dismissed App Lock prompt cannot reset');
    const forgottenSuccess = makeForgotRoute({ firstAsk: async () => ({ w: 'ERASE' }), confirm: async () => true }); await forgottenSuccess.c.invoke(); assert(forgottenSuccess.deps.resets === 1 && forgottenSuccess.deps.cfgClears === 1 && forgottenSuccess.deps.reloads === 1, 'App Lock reset executes and reloads only after both explicit confirmations');
    const forgottenWriteFail = makeForgotRoute({ firstAsk: async () => ({ w: 'ERASE' }), confirm: async () => true, resetResult: false }); await forgottenWriteFail.c.invoke(); assert(forgottenWriteFail.deps.resets === 1 && forgottenWriteFail.deps.cfgClears === 0 && forgottenWriteFail.deps.reloads === 0 && forgottenWriteFail.deps.notifications === 1, 'App Lock reset write failure preserves lock and reports failure without reload');

    const saveSource = appSource.match(/const save = \(\) => \{[\s\S]*?\n\};/)[0], mutateSource = appSource.match(/function mutate\(fn\) \{[\s\S]*?\n\}/)[0];
    const mutationCtx = { saveCalls: 0, renders: 0, announcements: 0 }; vm.createContext(mutationCtx);
    vm.runInContext(`const Store={isRecoveryRequired:()=>false,save:()=>{saveCalls++;return false}}, G={refreshDay:()=>({}),checkUnlocks:()=>({fresh:{}})}; let S={profile:{name:'Verified'},days:{},streak:{},habits:[]}, lastSavedState=JSON.parse(JSON.stringify(S)); const snap=()=>({}), today=()=> '2026-01-01', render=()=>{renders++}, announce=()=>{announcements++}; ${saveSource}; ${mutateSource}; globalThis.run=()=>mutate(()=>{S.profile.name='Unpersisted Candidate'}); globalThis.state=()=>S;`, mutationCtx);
    const mutationResult = mutationCtx.run(); assert(mutationResult === null && mutationCtx.state().profile.name === 'Verified' && mutationCtx.saveCalls === 1 && mutationCtx.announcements === 0, 'failed application mutation restores last verified in-memory state and emits no progression success');

    const confirmSource = securitySource.match(/async function confirmDataReset\(\) \{[\s\S]*?\n  \}/)[0], codeSource = securitySource.match(/function makeResetCode\(\) \{[\s\S]*?\n  \}/)[0];
    const confirmCtx = { crypto: require('crypto').webcrypto, mode: 'wrong', prompt: null, notifications: 0 }; confirmCtx.self = confirmCtx; confirmCtx.window = confirmCtx; vm.createContext(confirmCtx);
    vm.runInContext(`const g=globalThis; function makeResetCode() ${codeSource.slice(codeSource.indexOf('{'))}; const resetCodeMatches=(expected,entered)=>typeof expected==='string'&&/^\\d{5}$/.test(expected)&&entered===expected; const notify=async()=>{notifications++}; const ask=async o=>{prompt=o;const code=(o.body.match(/<b>(\\d{5})<\\/b>/)||[])[1];return mode==='cancel'?null:mode==='correct'?{code}:{code:'00000'}}; ${confirmSource}; globalThis.confirm=confirmDataReset;`, confirmCtx);
    const denied = await confirmCtx.confirm(), prompt = confirmCtx.prompt, shownCode = prompt.body.match(/<b>(\d{5})<\/b>/)[1];
    assert(!denied && /^\d{5}$/.test(shownCode) && (await prompt.validate({ code: '00000' })) !== '' && await prompt.validate({ code: shownCode }) === '', 'actual reset-code prompt rejects wrong digits and accepts only its fresh exact five-digit code');
    confirmCtx.mode = 'cancel'; assert(!(await confirmCtx.confirm()), 'actual reset-code prompt cancellation cannot confirm');
    confirmCtx.mode = 'correct'; assert(await confirmCtx.confirm(), 'actual reset-code prompt accepts its displayed code');
  })());
}
{
  const x = isolatedStore(), S = x.Store.load();
  x.flags.failNextSetKey = 'hunterarsenal.install.v1'; // target marker creation by key
  assert(!x.Store.save(S) && x.Store.isRecoveryRequired(), 'installation marker write failure is surfaced as recovery');
  assert(!!x.data['hunterarsenal.v3'] && !x.data['hunterarsenal.install.v1'], 'verified initial state is retained when marker creation fails');
  const restarted = isolatedStore(x.data);
  assert(restarted.Store.load() && restarted.data['hunterarsenal.v3'] === undefined && !restarted.data['hunterarsenal.install.v1'], 'restart rolls back an uncommitted first-install state instead of treating it as established progress');
  assert(restarted.Store.save(restarted.Store.load()) && restarted.data['hunterarsenal.install.v1'] === 'initialized', 'a later explicit verified initial save establishes state and marker');
}
{
  const x = isolatedStore(), S = x.Store.load(); assert(x.Store.save(S), 'existing-state marker rollback baseline saved');
  const previous = x.data['hunterarsenal.v3']; delete x.data['hunterarsenal.install.v1'];
  x.flags.failNextSetKey = 'hunterarsenal.install.v1'; S.profile.name = 'Do not replace';
  assert(!x.Store.save(S) && x.data['hunterarsenal.v3'] === previous && x.Store.isRecoveryRequired(), 'marker failure rolls back to the prior state when one exists');
}
{
  const raw = '{bad saved json', x = isolatedStore({ 'hunterarsenal.v3': raw });
  assert(x.Store.load() === null && x.Store.isRecoveryRequired(), 'malformed JSON activates recovery instead of returning defaults');
  assert(x.data['hunterarsenal.v3'] === raw, 'malformed original raw record remains unchanged');
  assert(!x.Store.save(x.Store.defaults()) && x.data['hunterarsenal.v3'] === raw, 'normal save is blocked during corrupt-record recovery');
  assert(x.Store.load() === null && x.data['hunterarsenal.v3'] === raw, 'repeated recovery startup does not overwrite corrupted data');
  const exported = JSON.parse(x.Store.exportRecovery());
  assert(exported.records.some(r => r.key === 'hunterarsenal.v3' && r.raw === raw), 'recovery export preserves the original raw record');
  const restarted = isolatedStore(x.data);
  assert(restarted.Store.load() === null && restarted.Store.isRecoveryRequired() && restarted.data['hunterarsenal.v3'] === raw, 'a fresh app instance remains in recovery after restart without overwriting the corrupt record');
}
{
  const x = isolatedStore({ 'hunterarsenal.v3': JSON.stringify({ v: 4, habits: {} }) });
  assert(x.Store.load() === null && x.Store.recoveryInfo().reason === 'invalid-saved-record', 'structurally invalid current state enters recovery');
  const x2 = isolatedStore({ 'hunterarsenal.v3': JSON.stringify({ v: 4, habits: [], profile: null }) });
  assert(x2.Store.load() === null && x2.Store.isRecoveryRequired(), 'invalid required nested structure enters recovery');
  const missing = isolatedStore({ 'hunterarsenal.v3': JSON.stringify({ v: 4, habits: [], profile: {}, settings: {} }) });
  assert(missing.Store.load() === null && missing.Store.isRecoveryRequired(), 'incomplete current schema is not silently filled with defaults');
  const partialV3 = Store.defaults(); partialV3.v = 3; partialV3.profile = {};
  const partial = isolatedStore({ 'hunterarsenal.v3': JSON.stringify(partialV3) });
  assert(partial.Store.load() === null && partial.Store.isRecoveryRequired() && partial.data['hunterarsenal.v3'] === JSON.stringify(partialV3), 'incomplete v3 profile is preserved and enters recovery instead of becoming Hunter');
}
{
  const legacyState = Store.defaults(); delete legacyState.v; legacyState.habits = [mk('legacy', 'VIT')];
  const legacy = JSON.stringify(legacyState), x = isolatedStore({ 'hunterarsenal.v2': legacy });
  x.flags.failSet = true;
  assert(x.Store.load() === null && x.Store.isRecoveryRequired(), 'failed v2 migration enters recovery');
  assert(x.data['hunterarsenal.v2'] === legacy && !x.data['hunterarsenal.v3'], 'failed migration preserves its source and does not create a default current record');
  x.flags.failSet = false;
  const migrated = x.Store.load();
  assert(migrated.habits[0].id === 'legacy' && migrated.v === 4 && JSON.parse(x.data['hunterarsenal.v3']).habits[0].id === 'legacy', 'migration safely retries and commits validated output');
}
{
  const largeLegacy = Store.defaults(); delete largeLegacy.v;
  largeLegacy.habits = Array.from({ length: 201 }, (_, i) => ({ id: `lh${i}`, name: `Legacy ${i}`, desc: '', icon: 'target', attr: 'STR', days: null, created: '2026-01-01', archived: true }));
  const raw = JSON.stringify(largeLegacy), x = isolatedStore({ 'hunterarsenal.v2': raw });
  const migrated = x.Store.load();
  assert(migrated && migrated.habits.length === 201 && JSON.parse(x.data['hunterarsenal.v3']).habits.length === 201, 'oversized legacy Habit data migrates without truncation');
  const incomplete = JSON.parse(raw); incomplete.profile = {};
  const bad = JSON.stringify(incomplete), y = isolatedStore({ 'hunterarsenal.v2': bad });
  assert(y.Store.load() === null && y.Store.isRecoveryRequired() && y.data['hunterarsenal.v2'] === bad && !y.data['hunterarsenal.v3'], 'incomplete v2 data is preserved in recovery without default-filled migration');
}
{
  const legacy = Store.defaults(); legacy.v = 3; delete legacy.streak.milestones;
  legacy.completions = { '2026-01-01': { old: { xp: G.CONST.HUNTER_XP + 5, ax: G.CONST.ATTR_XP, mx: G.CONST.MASTERY_XP, attr: 'STR', at: 1 } } };
  const raw = JSON.stringify(legacy), x = isolatedStore({ 'hunterarsenal.v3': raw });
  assert(x.Store.load() === null && x.Store.isRecoveryRequired() && x.data['hunterarsenal.v3'] === raw, 'migration rejects non-canonical historical XP rather than rewriting earned values');
}
{
  const x = isolatedStore(), legacy3 = x.Store.defaults(); legacy3.v = 3; legacy3.profile.name = 'Legacy Profile'; legacy3.streak.combo = 7; delete legacy3.streak.milestones;
  x.data['hunterarsenal.v3'] = JSON.stringify(legacy3);
  const migrated = x.Store.load();
  assert(migrated && migrated.v === 4 && migrated.profile.name === 'Legacy Profile' && migrated.streak.milestones.includes(7), 'valid schema v3 state migrates and preserves existing profile and streak progress');
}
{
  const legacy3 = Store.defaults(); legacy3.v = 3; legacy3.profile.name = 'Existing Custom Name'; legacy3.profile.createdAt = 0;
  legacy3.settings.sound = false; legacy3.settings.penalties = false; legacy3.completions = { '2026-01-01': { saved: { xp: G.CONST.HUNTER_XP, ax: G.CONST.ATTR_XP, mx: G.CONST.MASTERY_XP, attr: 'INT', at: 0 } } };
  legacy3.habits = [mk('saved', 'INT')]; legacy3.purchases = [{ id: 'forest', cost: 250, at: 0 }];
  legacy3.unlocked.titles.first = 0; legacy3.dailyQuest = { state: 'scheduled', at: 0, day: '2026-01-01', completed: 0, repeat: '07:15' };
  delete legacy3.streak.milestones;
  const source = JSON.stringify(legacy3), x = isolatedStore({ 'hunterarsenal.v3': source });
  const migrated = x.Store.load(), result = JSON.parse(x.data['hunterarsenal.v3']);
  assert(migrated && !x.Store.isRecoveryRequired() && migrated.profile.name === 'Existing Custom Name' && migrated.profile.createdAt === 0 && migrated.settings.sound === false && migrated.settings.penalties === false, 'v3 compatibility accepts and preserves custom profile, false settings and zero profile timestamp');
  assert(result.profile.createdAt === 0 && result.completions['2026-01-01'].saved.at === 0 && result.purchases[0].at === 0 && result.unlocked.titles.first === 0 && result.dailyQuest.at === 0 && result.dailyQuest.completed === 0 && result.habits[0].id === 'saved', 'legacy source values survive migration and verified current write');
  const current = isolatedStore({ 'hunterarsenal.v3': JSON.stringify(result) });
  const loaded = current.Store.load();
  assert(loaded && !current.Store.isRecoveryRequired() && loaded.profile.createdAt === 0 && loaded.profile.name === 'Existing Custom Name', 'migrated current-format record reloads without false recovery');
}
{
  const oldState = Store.defaults(); oldState.v = 3; delete oldState.streak.milestones;
  const old = isolatedStore({ 'hunterarsenal.v3': JSON.stringify(oldState) });
  const randomValues = old.c.crypto.getRandomValues;
  old.c.crypto.getRandomValues = () => { throw new Error('crypto failed'); };
  assert(old.Store.load() === null && old.Store.isRecoveryRequired(), 'sanitization failure activates recovery');
  old.c.crypto.getRandomValues = randomValues;
  const x = isolatedStore(), S = x.Store.load(); x.Store.save(S); const original = x.data['hunterarsenal.v3'];
  x.flags.failSet = true;
  assert(!x.Store.save(S) && x.Store.isRecoveryRequired(), 'storage write failure is reported and activates recovery');
  assert(x.data['hunterarsenal.v3'] === original, 'failed storage write preserves the last known-good record');
}
{
  const x = isolatedStore(), validHabit = (i, archived = true) => ({ id: `h${i}`, name: `Habit ${i}`, desc: '', icon: 'target', attr: 'STR', days: null, created: '2026-01-01', archived });
  const validSkill = i => ({ id: `s${i}`, name: `Skill ${i}`, desc: '', icon: 'book', attr: 'INT', created: '2026-01-01' });
  const importState = state => x.Store.importJSON(JSON.stringify({ app: 'HunterArsenal', data: state }));
  const habits = x.Store.defaults(); habits.habits = Array.from({ length: 201 }, (_, i) => validHabit(i));
  let candidate = importState(habits);
  assert(candidate.habits.length === 201, '201 valid Habits remain intact through backup import');
  assert(x.Store.restore(candidate).ok && JSON.parse(x.data['hunterarsenal.v3']).habits.length === 201, '201 Habits remain intact through restore and persistence');

  const skills = x.Store.defaults(); skills.skills = Array.from({ length: 101 }, (_, i) => validSkill(i));
  assert(importState(skills).skills.length === 101, '101 valid Skills remain intact through import');

  const logs = x.Store.defaults(); logs.skills = [validSkill(0)];
  logs.skillLog = Array.from({ length: 20001 }, (_, i) => ({ id: 's0', d: '2026-01-01', xp: G.CONST.PRACTICE_XP, at: i }));
  assert(importState(logs).skillLog.length === 20001, '20,001 Skill history records remain intact through import');

  const completions = x.Store.defaults(), day = {};
  for (let i = 0; i < 60001; i++) day[`c${i}`] = { xp: G.CONST.HUNTER_XP, ax: G.CONST.ATTR_XP, mx: G.CONST.MASTERY_XP, attr: 'STR', at: i };
  completions.completions = { '2026-01-01': day };
  assert(Object.keys(importState(completions).completions['2026-01-01']).length === 60001, '60,001 completion records remain intact through import');

  const purchases = x.Store.defaults(), cosmetic = G.COSMETICS.find(c => c.type === 'border');
  purchases.purchases = Array.from({ length: 101 }, (_, i) => ({ id: cosmetic.id, cost: cosmetic.cost, at: i }));
  assert(importState(purchases).purchases.length === 101, '101 valid purchase records remain intact through import');

  const before = x.data['hunterarsenal.v3'], malformed = x.Store.defaults();
  malformed.habits.push({ ...validHabit(300), name: ' padded ' });
  let rejected = false; try { importState(malformed); } catch (e) { rejected = true; }
  assert(rejected && x.data['hunterarsenal.v3'] === before, 'malformed import is rejected without replacing current data');
  const unknown = x.Store.defaults(); unknown.profile.userNote = 'keep me';
  rejected = false; try { importState(unknown); } catch (e) { rejected = true; }
  assert(rejected && x.data['hunterarsenal.v3'] === before, 'unsupported unknown fields are rejected rather than silently dropped');
  const activeOverflow = x.Store.defaults(); activeOverflow.habits = Array.from({ length: 9 }, (_, i) => validHabit(i, false));
  rejected = false; try { importState(activeOverflow); } catch (e) { rejected = true; }
  assert(rejected && x.data['hunterarsenal.v3'] === before, 'active Habit limit is enforced by safe rejection, not auto-archiving');
  const operator = x.Store.defaults(); operator.profile.name = 'Operator';
  assert(importState(operator).profile.name === 'Operator', 'a persisted profile name is not rewritten to a product default');
}
{
  const x = isolatedStore(), S = x.Store.load(); x.Store.save(S);
  const old = x.data['hunterarsenal.v3'];
  assert(!x.Store.save({ v: 4, habits: [] }) && x.data['hunterarsenal.v3'] === old, 'invalid candidate state cannot replace a valid saved record');
  const badRead = isolatedStore({ 'hunterarsenal.v3': '{read error preserved' }); badRead.flags.failGet = true;
  assert(badRead.Store.load() === null && badRead.Store.isRecoveryRequired() && !badRead.Store.save(badRead.Store.defaults()), 'storage read errors enter recovery and block writes');
}
{
  const x = isolatedStore(), S = x.Store.load(); x.Store.save(S); const old = x.data['hunterarsenal.v3'];
  vm.runInContext("JSON.stringify = () => { throw new Error('serialization failed'); }", x.c);
  const ok = x.Store.save(S);
  assert(!ok && x.data['hunterarsenal.v3'] === old && x.Store.isRecoveryRequired(), 'serialization failure preserves prior storage and enters recovery');
}
{
  const x = isolatedStore(), S = x.Store.load(); assert(x.Store.save(S), 'verification-read test baseline saved');
  const before = x.data['hunterarsenal.v3']; x.flags.failReadbackAfterSetKey = 'hunterarsenal.v3'; S.profile.name = 'Verification Failure';
  assert(!x.Store.save(S) && x.Store.isRecoveryRequired() && x.data['hunterarsenal.v3'] === before, 'verification read failure is not success and rollback restores the prior record');
}
{
  const x = isolatedStore(), S = x.Store.load(); x.Store.save(S);
  const other = JSON.parse(x.data['hunterarsenal.v3']); other.profile.name = 'Concurrent Tab';
  const otherRaw = JSON.stringify(other); x.flags.readbackMismatchAfterSetKey = 'hunterarsenal.v3'; x.flags.readbackMismatchValue = otherRaw;
  S.profile.name = 'Current Tab';
  assert(!x.Store.save(S) && x.Store.isRecoveryRequired() && x.data['hunterarsenal.v3'] === otherRaw, 'verification mismatch preserves the observed concurrent record instead of rolling it back');
}
{
  const x = isolatedStore(), S = x.Store.load(); x.Store.save(S); const before = x.data['hunterarsenal.v3'];
  x.flags.failReadbackAfterSetKey = 'hunterarsenal.v3'; x.flags.failNextSetAfterReadbackKey = 'hunterarsenal.v3'; S.profile.name = 'Rollback Failure';
  assert(!x.Store.save(S) && x.Store.recoveryInfo().reason === 'rollback-failure', 'rollback failure remains in recovery and blocks normal saves');
  assert(JSON.parse(x.Store.exportRecovery()).records.some(r => r.raw === before), 'rollback failure retains previous bytes for recovery export');
  const restarted = isolatedStore(x.data), recovered = restarted.Store.load();
  assert(recovered && recovered.profile.name === 'Hunter', 'restart after rollback failure restores the prior verified state instead of accepting the uncommitted candidate');
}
{
  const K = 'hunterarsenal.v3', J = 'hunterarsenal.recovery.v1', C = 'hunterarsenal.recovery.commit.v1', M = 'hunterarsenal.install.v1';
  const prepared = () => { const x = isolatedStore(), first = x.Store.load(); assert(x.Store.save(first), 'journal fixture establishes a verified baseline'); first.profile.name = 'Prior Verified'; assert(x.Store.save(first), 'journal fixture saves prior verified progress'); return x; };
  const candidate = x => { const s = vm.runInContext(`JSON.parse(${JSON.stringify(x.data[K])})`, x.c); s.profile.name = 'Uncommitted Candidate'; return s; };
  const expectPriorAfterRestart = (x, label, expectedPrior) => {
    const beforeRestart = { current: x.data[K], snapshot: x.data[J], commit: x.data[C] };
    const restarted = isolatedStore(x.data), recovered = restarted.Store.load();
    assert(recovered && recovered.profile.name === 'Prior Verified' && restarted.data[K] === expectedPrior, `${label}: fresh startup restores the exact prior verified bytes`);
    assert(!restarted.data[J] && !restarted.data[C], `${label}: recovery snapshot and commit are retired only after restoration verifies`);
    assert((beforeRestart.current == null || typeof beforeRestart.current === 'string') && typeof beforeRestart.snapshot === 'string', `${label}: current and snapshot bytes were captured before restart`);
    return restarted;
  };

  // Snapshot write, read-back, and candidate write failures are independently targeted by key.
  { const x = prepared(), old = x.data[K], commit = x.data[C]; x.flags.failNextSetKey = J; assert(!x.Store.save(candidate(x)) && x.data[K] === old && !x.data[J] && x.data[C] === commit, 'snapshot write failure blocks candidate write before current state changes'); assert(x.flags.injectedFailures.some(f => f.phase === 'write' && f.key === J), 'snapshot write failure was injected at the journal key'); const restarted = isolatedStore(x.data); assert(restarted.Store.load().profile.name === 'Prior Verified' && restarted.data[K] === old, 'restart after snapshot write failure preserves prior bytes'); }
  { const x = prepared(), old = x.data[K]; x.flags.quotaSetKey = J; assert(!x.Store.save(candidate(x)) && x.data[K] === old && !x.data[J], 'journal quota exhaustion blocks all writes to the current state'); assert(x.flags.injectedFailures.some(f => f.phase === 'quota' && f.key === J), 'quota failure was injected at journal preparation'); const r = isolatedStore(x.data); assert(r.Store.load().profile.name === 'Prior Verified' && r.data[K] === old, 'restart after journal quota failure preserves prior state'); }
  { const x = prepared(), old = x.data[K]; x.flags.writeThenThrowKey = J; assert(!x.Store.save(candidate(x)) && x.data[K] === old && typeof x.data[J] === 'string', 'snapshot write stored-then-threw leaves the prior current record intact'); assert(x.flags.injectedFailures.some(f => f.phase === 'partial-write' && f.key === J), 'partial snapshot write failure was injected after the targeted key changed'); expectPriorAfterRestart(x, 'partial snapshot write failure', old); }
  { const x = prepared(), old = x.data[K]; x.flags.failReadbackAfterSetKey = J; assert(!x.Store.save(candidate(x)) && x.data[K] === old && !!x.data[J], 'snapshot read-back failure blocks candidate write and retains snapshot bytes'); assert(x.flags.injectedFailures.some(f => f.phase === 'readback' && f.key === J), 'snapshot read-back failure was injected immediately after journal write'); expectPriorAfterRestart(x, 'snapshot read-back failure', old); }
  { const x = prepared(), old = x.data[K]; x.flags.failNextSetKey = K; assert(!x.Store.save(candidate(x)) && x.data[K] === old && !!x.data[J], 'candidate write failure leaves the prior state and prepared snapshot intact'); expectPriorAfterRestart(x, 'candidate write failure', old); }
  { const x = prepared(), old = x.data[K]; x.flags.writeThenThrowKey = K; assert(!x.Store.save(candidate(x)) && x.data[K] === old && !!x.data[J], 'candidate stored-then-threw is rolled back before save reports failure'); assert(x.flags.injectedFailures.some(f => f.phase === 'partial-write' && f.key === K), 'partial candidate write failure was injected at current-state write'); expectPriorAfterRestart(x, 'partial candidate write failure', old); }
  { const x = prepared(), old = x.data[K]; x.flags.failReadbackAfterSetKey = K; assert(!x.Store.save(candidate(x)) && x.data[K] === old && !!x.data[J], 'candidate read-back failure rolls back to the prior bytes and retains journal'); assert(x.flags.injectedFailures.some(f => f.phase === 'readback' && f.key === K), 'candidate read-back failure was injected at current-state read-back'); expectPriorAfterRestart(x, 'candidate read-back failure', old); }
  { const x = prepared(), old = x.data[K]; x.flags.failNextSetKey = C; assert(!x.Store.save(candidate(x)) && x.data[K] === old && !!x.data[J] && !x.data[C], 'commit write failure cannot leave the candidate authoritative'); expectPriorAfterRestart(x, 'commit write failure', old); }
  { const x = prepared(), old = x.data[K]; x.flags.writeThenThrowKey = C; assert(!x.Store.save(candidate(x)) && x.data[K] === old && !!x.data[J] && typeof x.data[C] === 'string', 'commit stored-then-threw is rolled back while retaining the ambiguous commit record'); assert(x.flags.injectedFailures.some(f => f.phase === 'partial-write' && f.key === C), 'partial commit write failure was injected at commit-record write'); expectPriorAfterRestart(x, 'partial commit write failure', old); }
  { const x = prepared(), old = x.data[K]; x.flags.failReadbackAfterSetKey = C; assert(!x.Store.save(candidate(x)) && x.data[K] === old && !!x.data[J], 'commit read-back failure rolls back and keeps recovery source'); assert(x.flags.injectedFailures.some(f => f.phase === 'readback' && f.key === C), 'commit read-back failure was injected at commit verification'); expectPriorAfterRestart(x, 'commit read-back failure', old); }

  // Recovery itself can fail without retiring the only snapshot; a subsequent restart retries it.
  { const x = prepared(), prior = x.data[K]; x.flags.failNextSetKey = C; x.Store.save(candidate(x)); const restart = isolatedStore(x.data); restart.flags.failNextSetKey = K; assert(restart.Store.load() === null && restart.Store.isRecoveryRequired() && restart.data[J], 'failed startup rollback enters recovery and leaves snapshot durable'); const retry = isolatedStore(restart.data), state = retry.Store.load(); assert(state && retry.data[K] === prior && !retry.data[J], 'later startup retries recovery from the preserved snapshot'); }

  // Candidate bytes with no commit always roll back, including a missing current key.
  { const x = prepared(), prior = x.data[K]; x.flags.failNextSetKey = C; x.Store.save(candidate(x)); delete x.data[K]; const restarted = expectPriorAfterRestart(x, 'missing current with valid snapshot', prior); assert(JSON.parse(restarted.data[K]).profile.name === 'Prior Verified', 'missing current is rebuilt from the only valid journal copy'); }

  // Capture durable storage images at write boundaries to model abrupt termination.
  { const x = prepared(), prior = x.data[K]; x.flags.captureAfterSetKey = J; assert(x.Store.save(candidate(x)), 'save completes while capturing immediately after snapshot write'); const image = x.flags.capturedData; assert(image[K] === prior && image[J] && !image[C], 'snapshot-write interruption image retains prior current state and no commit'); const r = isolatedStore(image), restored = r.Store.load(); assert(restored && r.data[K] === prior && !r.data[J], 'restart after snapshot write restores prior verified bytes'); }
  { const x = prepared(), prior = x.data[K]; x.flags.captureAfterReadbackKey = J; assert(x.Store.save(candidate(x)), 'save completes while capturing after snapshot read-back'); const image = x.flags.capturedData; assert(image[K] === prior && image[J] && !image[C], 'snapshot-readback interruption image is prepared before candidate write'); const r = isolatedStore(image), restored = r.Store.load(); assert(restored && r.data[K] === prior && !r.data[J], 'restart after snapshot read-back preserves prior verified bytes'); }
  { const x = prepared(), prior = x.data[K]; x.flags.captureAfterSetKey = K; assert(x.Store.save(candidate(x)), 'save completes while capturing immediately after candidate write'); const image = x.flags.capturedData; assert(image[K] !== prior && image[J] && !image[C], 'candidate-write interruption image has an uncommitted candidate and prior snapshot'); const r = isolatedStore(image), restored = r.Store.load(); assert(restored && r.data[K] === prior && !r.data[J], 'restart after candidate write rolls back before candidate read-back'); }
  { const x = prepared(), prior = x.data[K]; x.flags.captureAfterReadbackKey = K; assert(x.Store.save(candidate(x)), 'candidate save completes while capturing the post-verification interruption image');
    const image = x.flags.capturedData, payload = JSON.parse(image[J]).payload, journal = JSON.parse(payload), digest = require('crypto').createHash('sha256').update(image[K]).digest('hex');
    assert(x.flags.injectedFailures.some(f => f.phase === 'readback' && f.key === K) && journal.previous === prior && journal.candidateDigest === digest && image[C] === undefined, 'interruption after candidate verification has prior snapshot, matching digest, and no commit');
    const restarted = isolatedStore(image), recovered = restarted.Store.load(); assert(recovered && recovered.profile.name === 'Prior Verified' && restarted.data[K] === prior, 'restart before commit rolls back candidate to exact prior bytes'); }
  { const x = isolatedStore(), initial = x.Store.load(); x.flags.captureAfterSetKey = M; assert(x.Store.save(initial), 'initialization commits while capturing marker-write interruption boundary'); const image = x.flags.capturedData; assert(image[K] && image[M] === 'initialized' && image[J] && !image[C], 'marker interruption image has uncommitted candidate, marker, and prior-absent snapshot'); const r = isolatedStore(image), state = r.Store.load(); assert(state && !r.data[K] && !r.data[M] && !r.data[J], 'restart after first-install marker write removes uncommitted initial state and re-enters genuine first install'); }
  { const x = prepared(); x.flags.captureAfterSetKey = C; assert(x.Store.save(candidate(x)), 'candidate save completes while capturing immediately after commit write');
    const image = x.flags.capturedData, restarted = isolatedStore(image), committed = restarted.Store.load(); assert(x.flags.injectedFailures.some(f => f.phase === 'write' && f.key === C), 'commit-write interruption image was captured at the named commit phase'); assert(committed && committed.profile.name === 'Uncommitted Candidate', 'startup validates and accepts a matching durable commit written before termination'); }
  { const x = prepared(); x.flags.captureAfterReadbackKey = C; assert(x.Store.save(candidate(x)), 'candidate save completes while capturing after commit read-back');
    const image = x.flags.capturedData, restarted = isolatedStore(image), committed = restarted.Store.load(); assert(x.flags.injectedFailures.some(f => f.phase === 'readback' && f.key === C), 'post-commit-readback image was captured at the named verification phase'); assert(committed && committed.profile.name === 'Uncommitted Candidate', 'restart after commit verification preserves the committed candidate'); }
  { const x = prepared(), prior = x.data[K]; x.flags.captureAfterRemoveKey = C; assert(x.Store.save(candidate(x)), 'candidate save completes while capturing commit retirement boundary');
    const image = x.flags.capturedData, restarted = isolatedStore(image), recovered = restarted.Store.load(); assert(x.flags.injectedFailures.some(f => f.phase === 'remove' && f.key === C), 'commit retirement boundary was captured'); assert(recovered && recovered.profile.name === 'Prior Verified' && restarted.data[K] === prior, 'termination after commit marker removal but before snapshot removal conservatively restores prior bytes'); }
  { const x = prepared(); x.flags.captureAfterRemoveKey = J; assert(x.Store.save(candidate(x)), 'candidate save completes while capturing recovery-copy retirement boundary');
    const image = x.flags.capturedData, restarted = isolatedStore(image), committed = restarted.Store.load(); assert(x.flags.injectedFailures.some(f => f.phase === 'remove' && f.key === J), 'snapshot retirement boundary was captured after commit retirement'); assert(committed && committed.profile.name === 'Uncommitted Candidate' && !restarted.data[J] && !restarted.data[C], 'termination after verified snapshot retirement leaves validated committed current state'); }

  // Corruption and unexpected authority states preserve every available raw byte and enter recovery.
  { const x = prepared(); x.flags.failNextSetKey = C; x.Store.save(candidate(x)); x.data[J] = '{corrupt journal'; const current = x.data[K], rawJournal = x.data[J]; const r = isolatedStore(x.data); assert(r.Store.load() === null && r.Store.isRecoveryRequired() && r.data[K] === current && r.data[J] === rawJournal, 'corrupt snapshot preserves current and journal bytes in recovery'); assert(JSON.parse(r.Store.exportRecovery()).records.some(v => v.key === J && v.raw === rawJournal), 'corrupt journal bytes are included in recovery export'); }
  { const x = prepared(), current = x.data[K], orphan = JSON.stringify({ v: 1, current: 'a'.repeat(64) }); x.data[C] = orphan; const r = isolatedStore(x.data); assert(r.Store.load() === null && r.Store.isRecoveryRequired() && r.data[K] === current && r.data[C] === orphan, 'orphan commit without snapshot enters recovery and preserves current and commit bytes'); }
  { const x = prepared(), prior = x.data[K]; x.flags.failNextSetKey = C; x.Store.save(candidate(x)); x.data[C] = '{corrupt commit'; expectPriorAfterRestart(x, 'corrupt commit record', prior); }
  { const x = prepared(); x.flags.failNextSetKey = C; x.Store.save(candidate(x)); x.data[K] = '{corrupt candidate'; const current = x.data[K], snap = x.data[J]; const r = isolatedStore(x.data); assert(r.Store.load() === null && r.Store.isRecoveryRequired() && r.data[K] === current && r.data[J] === snap, 'corrupt candidate matching neither journal image enters recovery without overwrite'); }
  { const x = prepared(); x.flags.failNextSetKey = C; x.Store.save(candidate(x)); x.data[K] = JSON.stringify({ ...JSON.parse(x.data[K]), profile: { ...JSON.parse(x.data[K]).profile, name: 'Unexpected Third State' } }); const current = x.data[K], snap = x.data[J]; const r = isolatedStore(x.data); assert(r.Store.load() === null && r.Store.isRecoveryRequired() && r.data[K] === current && r.data[J] === snap, 'state matching neither snapshot nor candidate remains untouched in recovery'); }
  { const x = prepared(), prior = x.data[K]; x.flags.failNextSetKey = C; x.Store.save(candidate(x)); expectPriorAfterRestart(x, 'repeated startup recovery', prior); const again = isolatedStore(x.data); assert(again.Store.load().profile.name === 'Prior Verified', 'second fresh startup remains stable after recovery'); }

  // Ordinary writes, migration, explicit restore and reset all retire their journal after verification.
  { const x = prepared(), s = candidate(x); assert(x.Store.save(s) && !x.data[J] && !x.data[C], 'ordinary committed write leaves no live journal'); }
  { const legacy = Store.defaults(); delete legacy.v; legacy.profile.name = 'Journal Migration'; const raw = JSON.stringify(legacy), x = isolatedStore({ 'hunterarsenal.v2': raw }); const result = x.Store.load(); assert(result && result.profile.name === 'Journal Migration' && !x.data[J] && !x.data[C] && !x.data['hunterarsenal.v2'], 'legacy migration verifies destination before source removal and journal retirement'); }
  { const x = prepared(), backup = x.Store.defaults(); backup.profile.name = 'Journal Restore'; assert(x.Store.restore(backup).ok && !x.data[J] && !x.data[C], 'explicit restore commits before retiring journal'); const reset = x.Store.reset(); assert(reset.ok && !x.data[J] && !x.data[C], 'explicit reset commits before retiring journal'); }
  { const x = prepared(), prior = x.data[K], backup = vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(x.Store.defaults()))})`, x.c); backup.profile.name = 'Failed Journal Restore'; x.flags.failNextSetKey = C; assert(!x.Store.restore(backup).ok && x.data[K] === prior && x.data[J] && !x.data[C], 'failed explicit restore retains prior state and recovery snapshot'); expectPriorAfterRestart(x, 'failed explicit restore', prior); }
  { const x = prepared(), prior = x.data[K]; x.flags.failNextSetKey = C; assert(!x.Store.reset().ok && x.data[K] === prior && x.data[J] && !x.data[C], 'failed explicit reset retains prior progress and journal'); expectPriorAfterRestart(x, 'failed explicit reset', prior); }
  { const legacy = Store.defaults(); delete legacy.v; legacy.profile.name = 'Interrupted Legacy'; const raw = JSON.stringify(legacy), x = isolatedStore({ 'hunterarsenal.v2': raw }); x.flags.captureAfterReadbackKey = K; const loaded = x.Store.load(); assert(loaded && x.flags.capturedData[K] && x.flags.capturedData[J] && x.flags.capturedData['hunterarsenal.v2'] === raw, 'migration destination verification boundary retains the legacy source'); const restarted = isolatedStore(x.flags.capturedData), migrated = restarted.Store.load(); assert(migrated && migrated.profile.name === 'Interrupted Legacy' && JSON.parse(restarted.data[K]).profile.name === 'Interrupted Legacy', 'restart after interrupted migration safely retries from the preserved legacy source'); }
  { const legacy = Store.defaults(); delete legacy.v; legacy.profile.name = 'Migration Test'; const raw = JSON.stringify(legacy), x = isolatedStore({ 'hunterarsenal.v2': raw }); x.flags.failReadbackAfterSetKey = K; assert(x.Store.load() === null && x.Store.isRecoveryRequired() && x.data['hunterarsenal.v2'] === raw, 'migration destination read-back failure preserves legacy source'); const r = isolatedStore(x.data), migrated = r.Store.load(); assert(migrated && migrated.profile.name === 'Migration Test' && r.data['hunterarsenal.v2'] === undefined, 'fresh startup recovers and retries validated legacy migration'); }
}
{
  const shared = {}, tabA = isolatedStore({}, shared), tabB = isolatedStore({}, shared);
  const stateA = tabA.Store.load(), stateB = tabB.Store.load();
  assert(tabA.Store.save(stateA), 'first simulated tab establishes its saved record');
  stateB.profile.name = 'Stale Tab';
  assert(!tabB.Store.save(stateB) && tabB.Store.isRecoveryRequired() && JSON.parse(shared['hunterarsenal.v3']).profile.name === 'Hunter', 'stale sequential tab save is rejected without overwriting newer data');
}
{
  const x = isolatedStore(), initial = x.Store.load(); x.Store.save(initial);
  const before = x.data['hunterarsenal.v3'];
  const backupText = x.Store.exportJSON(initial), exported = JSON.parse(backupText);
  assert(exported.format === 'backup' && exported.formatVersion === 1 && exported.data.v === 4, 'backup export includes explicit envelope and schema version metadata');
  assert(x.Store.importJSON(backupText).v === 4 && x.data['hunterarsenal.v3'] === before, 'new versioned backup round-trips without changing current saved data');
  assert(x.Store.importJSON(JSON.stringify({ app: 'HunterArsenal', version: '2.5.0', exportedAt: 'legacy', data: initial })).v === 4, 'legacy backup without explicit format metadata remains import-compatible');
  let unsupportedEnvelopeRejected = false, malformedEnvelopeRejected = false;
  try { x.Store.importJSON(JSON.stringify({ ...exported, formatVersion: 999 })); } catch (e) { unsupportedEnvelopeRejected = true; }
  try { x.Store.importJSON(JSON.stringify({ ...exported, formatVersion: undefined })); } catch (e) { malformedEnvelopeRejected = true; }
  assert(unsupportedEnvelopeRejected && malformedEnvelopeRejected && x.data['hunterarsenal.v3'] === before, 'unsupported and malformed explicit backup metadata is rejected without changing current progress');
  let invalidExportRejected = false;
  try { x.Store.exportJSON({ v: 4, habits: [] }); } catch (e) { invalidExportRejected = true; }
  assert(invalidExportRejected && x.data['hunterarsenal.v3'] === before, 'invalid backup export is rejected without changing saved data');
  let invalidRejected = false;
  try { x.Store.importJSON(JSON.stringify({ app: 'HunterArsenal', data: { v: 4, habits: {} } })); } catch (e) { invalidRejected = true; }
  assert(invalidRejected && x.data['hunterarsenal.v3'] === before, 'invalid imported backup cannot replace current valid data');
  const backup = JSON.parse(before); backup.profile.name = 'Backup Hunter';
  const candidate = x.Store.importJSON(JSON.stringify({ app: 'HunterArsenal', data: backup }));
  assert(x.data['hunterarsenal.v3'] === before, 'validated import is not persisted before explicit restore');
  assert(x.Store.restore(candidate).ok && JSON.parse(x.data['hunterarsenal.v3']).profile.name === 'Backup Hunter', 'valid imported backup replaces current state only through restore');
  const state = x.Store.reset();
  assert(state.ok && state.state.habits.length === 0 && !x.Store.isRecoveryRequired(), 'explicit reset writes a valid clean state and resolves recovery');
}
{
  const damaged = '{data needs recovery', x = isolatedStore({ 'hunterarsenal.v3': damaged }), backup = x.Store.defaults();
  x.Store.load();
  const candidate = x.Store.importJSON(JSON.stringify({ app: 'HunterArsenal', data: backup }));
  assert(x.data['hunterarsenal.v3'] === damaged && x.Store.isRecoveryRequired(), 'valid backup is staged in memory without overwriting the damaged source');
  const restored = x.Store.restore(candidate);
  assert(restored.ok && !x.Store.isRecoveryRequired() && JSON.parse(x.data['hunterarsenal.v3']).v === 4, 'validated backup explicitly resolves recovery and permits later saves');
  restored.state.profile.name = 'Recovered Hunter';
  assert(x.Store.save(restored.state) && JSON.parse(x.data['hunterarsenal.v3']).profile.name === 'Recovered Hunter', 'normal validated writes resume only after recovery resolves');
}
{
  const raw = '{preserve me', x = isolatedStore({ 'hunterarsenal.v3': raw }); x.Store.load();
  x.flags.failSet = true;
  assert(!x.Store.reset().ok && x.data['hunterarsenal.v3'] === raw && x.Store.isRecoveryRequired(), 'reset write failure does not erase data or exit recovery');
}
{
  const raw = '{preserve me too', x = isolatedStore({ 'hunterarsenal.v3': raw }); x.Store.load();
  const randomValues = x.c.crypto.getRandomValues;
  x.c.crypto.getRandomValues = () => { throw new Error('random source unavailable'); };
  assert(!x.Store.reset().ok && x.data['hunterarsenal.v3'] === raw && x.Store.isRecoveryRequired(), 'reset initialization failure preserves the original record');
  x.c.crypto.getRandomValues = randomValues;
}

// ---- Daily Quest cycle
{ const S = Store.defaults(), d = '2026-02-02'; S.habits.push(mk('a', 'STR', '2026-02-01')); S.streak.processed = '2026-02-01';
  G.dqSchedule(S, 1000); assert(!G.dqTick(S, 999) && G.dqTick(S, 1000) && S.dailyQuest.state === 'available', 'quest becomes available at the scheduled time');
  G.dqAccept(S, d); G.toggleHabit(S, 'a', d, 1); const ev = G.refreshDay(S, d); assert(ev.dqCompleted && S.days[d].dq === 25 && G.totalXP(S) === 35, 'clearing it gives +25 Hunter XP only');
  assert(G.attrXP(S).STR === 5 && G.masteryXPMap(S).a === 5, 'Daily Quest adds no attribute or mastery XP');
  assert(G.dqCanSchedule(S), 'another cycle can be scheduled'); G.dqSchedule(S, 5000); assert(S.dailyQuest.state === 'scheduled', 'cycle 2 scheduled (repeatable)');
  G.dqTick(S, 6000); G.dqAccept(S, '2026-02-03'); G.processDays(S, '2026-02-05'); assert(S.dailyQuest.state === 'failed', 'quest fails if the day ends uncleared'); }
// ---- automatic Streak Freeze + flat uncapped Core XP penalty
{ const S = Store.defaults(); S.settings.penalties = true; S.habits.push(mk('a', 'STR', '2026-03-01')); S.streak.processed = '2026-02-28'; S.streak.freezes = 1; S.streak.combo = 5;
  G.processDays(S, '2026-03-03'); assert(S.streak.freezes === 0 && S.days['2026-03-01'].frozen && S.days['2026-03-02'].penalty === 2 && S.streak.combo === 0, 'automatic freeze preserves first missed day; next miss costs −2 Core XP');
  assert(G.attrXP(S).STR === 0 && Object.keys(G.masteryXPMap(S)).length === 0, 'penalties never touch attribute or mastery XP'); }

// ---- per-missed-Habit penalties, no daily cap, only Core XP
for (const [count,expected] of [[0,0],[1,2],[2,4],[4,8],[8,16]]) {
  const S=Store.defaults(),d='2026-05-01'; for(let i=0;i<8;i++)S.habits.push(mk('m'+i,'STR','2026-04-01'));
  S.streak.processed='2026-04-30'; S.days[d]={sched:8,done:8-count,perfect:false,penalty:0,dq:0};
  G.processDays(S,'2026-05-02');
  assert(S.days[d].habitPenalty===expected && S.days[d].penalty===expected,`${count} missed Habits cost −${expected} Core XP`);
  assert(G.attrXP(S).STR===0&&Object.keys(G.masteryXPMap(S)).length===0,`${count} missed Habits leave attribute/mastery XP unchanged`);
}
{const S=Store.defaults(),d='2026-05-02';S.habits=Array.from({length:8},(_,i)=>mk('x'+i,'VIT','2026-04-01'));S.streak.processed='2026-05-01';G.processDays(S,'2026-05-03');assert(S.days[d].penalty===16,'eight missed Habits have no daily penalty cap');}

// ---- Daily Mission outcomes are distinct and apply once
{const d='2026-05-04',S=Store.defaults();S.streak.processed='2026-05-03';S.dailyQuest.state='accepted';S.dailyQuest.day=d;G.processDays(S,'2026-05-05');assert(S.days[d].penalty===20&&S.days[d].dqPenalty===20&&S.dailyQuest.state==='failed','accepted then failed mission costs −20 Core XP');}
{const d='2026-05-06',S=Store.defaults();S.streak.processed='2026-05-05';S.dailyQuest.state='available';S.dailyQuest.day=d;G.dqDecline(S);assert(S.days[d].penalty===10&&S.days[d].dqPenalty===10,'declined mission costs −10 immediately');}
{const d='2026-05-08',S=Store.defaults();S.streak.processed='2026-05-07';S.dailyQuest.state='available';S.dailyQuest.day=d;G.processDays(S,'2026-05-09');assert(S.days[d].penalty===10&&S.dailyQuest.state==='declined','ignored/expired mission costs −10');}
{const d='2026-05-10',S=Store.defaults();S.streak.processed='2026-05-09';S.dailyQuest.state='accepted';S.dailyQuest.day=d;G.processDays(S,'2026-05-11');G.processDays(S,'2026-05-12');assert(S.days[d].penalty===20,'processing a failed mission again never duplicates its penalty');}
{const d='2026-05-12',S=Store.defaults();S.streak.processed='2026-05-11';S.dailyQuest.state='accepted';S.dailyQuest.day=d;G.processDays(S,'2026-05-13');S.streak.freezes=1;G.declareRestDay(S,d);assert(S.days[d].dqPenalty===20&&S.days[d].penalty===20,'a later Rest Day cannot cancel accepted mission risk');}
{const S=Store.defaults();assert(G.totalXP(S)===0,'no Daily Mission produces no mission penalty');}

// ---- Streak Freeze rewards, unique milestones, and bank cap
for(const [days,reward] of [[3,1],[7,2],[30,5],[60,5],[90,5]]){const S=Store.defaults(),d='2026-06-01';S.streak.combo=days-1;S.streak.processed=G.addDays(d,-1);S.days[d]={sched:1,done:1,perfect:true,penalty:0,dq:0};const ev=G.processDays(S,G.addDays(d,1));assert(S.streak.freezes===Math.min(reward,G.CONST.FREEZE_CAP)&&ev.events.some(e=>e.type==='freeze'),`${days}-day Streak milestone grants ${reward} freeze(s) up to bank cap`);}
{const S=Store.defaults();S.streak.freezes=9;S.streak.combo=2;S.streak.processed='2026-06-10';S.days['2026-06-11']={sched:1,done:1,perfect:true,penalty:0,dq:0};G.processDays(S,'2026-06-12');assert(S.streak.freezes===10,'Streak Freeze bank never exceeds 10');}

// ---- Rest Day and auto-freeze behavior
{const S=Store.defaults(),d='2026-07-01';S.streak.processed='2026-06-30';S.streak.combo=12;S.streak.freezes=1;S.habits=Array.from({length:8},(_,i)=>mk('r'+i,'INT','2026-06-01'));assert(G.declareRestDay(S,d)&&S.streak.freezes===0,'manual Rest Day consumes one Streak Freeze');G.processDays(S,'2026-07-02');assert(S.days[d].penalty===0&&S.streak.combo===12,'Rest Day cancels missed-Habit penalty and preserves count without increment');}
{const S=Store.defaults(),d='2026-07-03';S.streak.processed='2026-07-02';S.streak.combo=4;S.streak.freezes=1;S.habits=[mk('af','STR','2026-07-01')];G.processDays(S,'2026-07-04');assert(S.streak.freezes===0&&S.streak.combo===4&&S.days[d].penalty===0,'automatic Streak Freeze preserves incomplete-day Streak');}
{const S=Store.defaults(),d='2026-07-05';S.streak.processed='2026-07-04';S.streak.combo=4;S.streak.freezes=1;S.settings.autoFreeze=false;S.habits=[mk('noaf','STR','2026-07-01')];G.processDays(S,'2026-07-06');assert(S.streak.freezes===1&&S.streak.combo===0&&S.days[d].penalty===2,'automatic freeze can be disabled; missing day processes normally');}
{const S=Store.defaults(),d='2026-07-07',now=Date.parse(d+'T12:00:00');S.streak.freezes=1;G.dqSchedule(S,now-1000);G.declareRestDay(S,d);G.dqTick(S,now);assert(S.dailyQuest.state==='none','pre-declared Rest Day prevents a scheduled Daily Mission from arriving');}
// ---- unlocks & card
{ const S = Store.defaults(), d = '2026-04-01'; S.habits.push(mk('a', 'STR', d)); S.streak.processed = '2026-03-31';
  G.toggleHabit(S, 'a', d, Date.parse(d + 'T04:00:00')); G.refreshDay(S, d); const u = G.checkUnlocks(S, d);
  assert(S.unlocked.titles.first && S.profile.equippedTitle === 'first' && u.fresh.achievements.some(a => a.id === 'first_step'), 'first check-in unlocks First Blood and auto-equips it');
  const card = G.getHunterCardData(S, d); assert(card.level === 1 && card.rank === 'E' && card.rankTitle === 'Provisional Hunter' && card.hunterId.startsWith('HA-'), 'Hunter Card data comes from the single source'); }
assert(G.ACHIEVEMENTS.length === 25, '25 achievements'); assert(G.TITLES.length === 28 && new Set(G.TITLES.map(x => x.id)).size === 28, '28 titles, unique ids');
// ---- GitHub Pages PWA prerequisites and settings/rules source contract
{const app=fs.readFileSync(path.join(__dirname,'js','app.js'),'utf8'),sw=fs.readFileSync(path.join(__dirname,'sw.js'),'utf8'),manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
 assert(manifest.name==='HunterArsenal'&&manifest.short_name==='HunterArsenal'&&manifest.display==='standalone'&&manifest.start_url==='./'&&manifest.scope==='./','manifest has standalone display and relative GitHub Pages scope');
 assert(manifest.icons.length>=4&&manifest.icons.every(i=>fs.existsSync(path.join(__dirname,i.src))),'all standard and maskable PWA icons exist');
 assert(['Account','Daily Mission','Appearance','Gameplay','Security','Data & Sync','About'].every(x=>app.includes(`'${x}'`)),'Settings source includes all seven dedicated pages');
 assert(['Core XP','Habit completion','Missed-Habit penalties','Daily Mission','Streak','Streak Freeze','Rest Day','Habit Mastery','Attributes and progression'].every(x=>app.includes(`['${x}'`)),'Hunter\'s Rules defines all nine required sections');
 assert(app.includes('navigator.vibrate')&&app.includes('mission-countdown')&&app.includes('systemAlert'),'Daily Mission notice includes haptic, countdown, and System Notice presentation');
 const home=(app.match(/function homeHTML\(\) \{([\s\S]*?)\n\}/)||[])[1]||'';
 assert(!home.includes('help-shortcut')&&!home.includes('aria-label="Hunter\'s Rules"')&&home.includes('rulesHomeCard()'),'Home has no Rules shortcut and retains the first-run Rules card');
 assert(app.includes('relative=G.normalizeAttrDistribution(attrXp)')&&app.includes('attrXp=G.attrXP(S)')&&app.includes('scale=G.CONST.ATTR_TIER_STARTS[4]')&&app.includes('Scale: 0–${fmt(scale)} XP'),'Versatility uses authoritative XP, relative geometry and fixed 1,600 XP reference');
 assert(app.includes('G.newAttributeClassUnlocks(before.attrXp, after.attrXp)')&&app.includes("title: 'ATTRIBUTE CLASS ACHIEVED'")&&app.includes('Attribute Class AWAKENING unlocked.')&&app.includes('Attribute Class Tier ${G.TIER_ROMAN[idx]} unlocked.'),'Attribute class notices use real XP crossings and the existing System Notice queue');
 assert(app.includes('data-act="class-overview"')&&app.includes('function classOverviewModal()')&&app.includes('Individual progression across all five Attributes'),'Home class control opens an overview of all five independent Attributes');
 assert(app.includes('G.sortAttributesByXP(ax).map(a => {')&&app.includes('const A = G.ATTRS[a], xp = ax[a], t = G.attrTier(a, xp);'),'Overview sorts Attribute IDs while rendering each section from its own current XP');
 assert(app.includes('Settings · ${esc(settingsSub)}')&&app.includes('"Hunter\'s Rules"'),'Hunter\'s Rules remains accessible from Settings');
 assert(sw.includes("'./manifest.json'")&&sw.includes("'./icons/icon-512.png'"),'service worker precaches relative manifest and app icon');
 assert(sw.includes('event.respondWith(staleWhileRevalidate(req, event))')&&sw.includes('event.waitUntil(network.then(() => undefined))'),'service worker keeps stale-while-revalidate work alive until cache refresh completes');
 assert(sw.includes("keys.filter((k) => k.startsWith('hunter-arsenal-') && k !== CACHE)")&&!sw.includes('localStorage')&&!sw.includes('indexedDB'),'service-worker cleanup remains limited to versioned app caches, separate from progress storage');
 assert(app.includes('The browser granted persistent storage.')&&app.includes('The browser did not grant persistent storage.')&&app.includes('does not affect offline use'),'storage persistence status explains the browser result without blocking offline use');
 assert(app.includes("const first = dialog.querySelector(")&&app.includes("if (e.key === 'Tab' && dialog)")&&app.includes('sheetReturnFocus'),'sheets set initial focus, trap keyboard focus, and restore focus to the opener');}
// ---- Release history reuses What's New and keeps announcement acknowledgement separate
{
  const app = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
  const sw = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
  const whatsNewSource = app.match(/function whatsNew\(showHistory = false\) \{[\s\S]*?\n\}/)[0];
  const historyCtx = { CHANGELOG: [...ctx.CHANGELOG].reverse(), APP_VERSION: ctx.APP_VERSION, notices: [], saves: 0, state: { meta: { lastAcknowledgedWhatsNewVersion: null } } };
  vm.createContext(historyCtx);
  vm.runInContext(`const window={APP_VERSION:APP_VERSION,CHANGELOG:CHANGELOG}, Notice={show(n){notices.push(n)}}, S=state; const esc=x=>String(x), ic=()=>'<i></i>', save=()=>{saves++}; ${whatsNewSource}; globalThis.openHistory=()=>whatsNew(true); globalThis.openAnnouncement=()=>whatsNew();`, historyCtx);
  historyCtx.openHistory();
  const history = historyCtx.notices[0], releaseVersions = [...history.bodyHTML.matchAll(/<span>v([^<]+)<\/span>/g)].map(m => m[1]);
  assert(releaseVersions.join(',') === '2.6.0,2.5.0,2.4.0,2.3.0,2.2.0,2.1.0,2.0.0', 'release history orders available releases newest to oldest');
  assert(history.bodyHTML.includes('<details class="nw-release" open>') && (history.bodyHTML.match(/<details class="nw-release"/g) || []).length === releaseVersions.length, 'release history expands the latest entry and makes previous releases expandable');
  assert(history.primary.label === 'CLOSE' && !history.primary.onClick && historyCtx.state.meta.lastAcknowledgedWhatsNewVersion === null && historyCtx.saves === 0, 'opening and closing Settings release history does not acknowledge an unseen release');
  assert(app.includes("item('info',\"What's New\"") && app.includes("case 'whatsnew': whatsNew(true); break;"), 'Settings → What’s New opens the existing release-history renderer');
  historyCtx.openAnnouncement();
  const announcement = historyCtx.notices[1];
  assert(announcement.subtitle === 'v2.6.0' && announcement.bodyHTML.includes('OFFLINE DATA PROTECTION') && announcement.primary.label === 'CONTINUE' && announcement.escapeDismiss, 'first-launch/update announcement remains the latest release with its existing action and dismissal');
  announcement.primary.onClick();
  assert(historyCtx.state.meta.lastAcknowledgedWhatsNewVersion === '2.6.0' && historyCtx.saves === 1, 'announcement Continue retains the established acknowledgement and save behavior');
  const showIfNeededSource = app.match(/function showWhatsNewIfNeeded\(\) \{[\s\S]*?\n\}/)[0];
  const announcementGate = { APP_VERSION: '2.6.0', ack: null, opened: 0 };
  vm.createContext(announcementGate);
  vm.runInContext(`const window={APP_VERSION:APP_VERSION}, S={meta:{lastAcknowledgedWhatsNewVersion:ack}}; const whatsNew=()=>{opened++}; ${showIfNeededSource}; globalThis.check=showWhatsNewIfNeeded;`, announcementGate);
  announcementGate.check();
  announcementGate.ack = '2.6.0';
  vm.runInContext(`S.meta.lastAcknowledgedWhatsNewVersion=ack;`, announcementGate);
  announcementGate.check();
  assert(announcementGate.opened === 1, 'first-launch/update gate shows unseen current release once and respects saved acknowledgement');
  const systemWindow = fs.readFileSync(path.join(__dirname, 'js', 'systemwindow.js'), 'utf8');
  assert(systemWindow.includes("close(active.secondary || active.escapeDismiss ? 'secondary' : 'primary')"), 'dismissing the announcement with Escape does not invoke Continue acknowledgement');
  assert(sw.includes("'./js/version.js'") && sw.includes("'./js/app.js'") && sw.includes("'./css/styles.css'"), 'release history data, renderer, and styles remain available from the offline app shell');
}
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
  const repeatState = Store.defaults(); repeatState.dailyQuest.repeat = '07:15';
  const R = Store.importJSON(JSON.stringify({ app: 'HunterArsenal', data: repeatState })); assert(R.dailyQuest.repeat === '07:15', 'repeat survives validated import/normalization'); }

Promise.all(asyncChecks).then(() => {
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exitCode = fails ? 1 : 0;
});
