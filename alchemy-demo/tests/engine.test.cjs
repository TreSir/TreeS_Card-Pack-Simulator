const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');

const make = (stageId = 'gate', seed = 1234) => {
  const p = E.initial(); p.cleared = ['gate', 'dusk'];
  return E.start(p, stageId, null, seed);
};
const items = (...ids) => ids.map((id, i) => ({ id, uid: `test-${i}` }));

test('a paid starter consumes exactly one copy; free starts never mint inventory', () => {
  const p = E.initial(), result = E.start(p, 'gate', 'sun', 7);
  assert.equal(result.profile.inventory.sun, p.inventory.sun - 1);
  assert.equal(p.inventory.sun, 2);
  assert.equal(result.run.array[0].id, 'sun');
  assert.deepEqual(E.start(p, 'gate', null, 7).profile, p);
  assert.throws(() => E.start(p, 'gate', 'nova', 7));
  assert.throws(() => E.start(p, 'clock', null, 7));
});

test('drafting is reversible, limited to one per destination, and never duplicates a physical card', () => {
  const { run } = make(); E.open(run);
  const [a, b] = run.pack;
  E.assign(run, a.uid, 'array'); E.assign(run, b.uid, 'array');
  assert.equal(run.picks.array.uid, b.uid);
  E.assign(run, b.uid, 'furnace');
  assert.equal(run.picks.array, null);
  assert.equal(E.projected(run).furnace[0].uid, b.uid);
  E.assign(run, b.uid, 'furnace');
  assert.equal(run.picks.furnace, null);
  assert.throws(() => E.assign(run, 'unknown', 'array'));
});

test('six packs are a hard budget; a pack cannot score twice or be rerolled', () => {
  const { run } = make();
  for (let i = 0; i < 6; i++) {
    E.open(run); assert.throws(() => E.open(run));
    const before = run.total; E.settle(run);
    assert.equal(run.total, before + run.last.total);
    assert.throws(() => E.settle(run));
  }
  assert.throws(() => E.open(run));
  assert.equal(run.history.length, 6);
});

test('packs contain five cards, have a scoring option, and cap identical copies at two', () => {
  for (let seed = 1; seed < 150; seed++) {
    const { run } = make('gate', seed);
    for (let turn = 0; turn < 6; turn++) {
      E.open(run);
      assert.equal(run.pack.length, 5);
      assert.ok(run.pack.some(c => ['产分', '炼金'].includes(E.card(c.id).tag)));
      for (const c of run.pack) assert.ok(run.pack.filter(x => x.id === c.id).length <= 2);
      E.settle(run);
    }
  }
});

test('full arrays require an explicit replacement; replacement consumes the old card', () => {
  const { run } = make(); run.array = items('sun', 'moon', 'star', 'wheel', 'fool');
  E.open(run); const a = run.pack[0];
  assert.throws(() => E.assign(run, a.uid, 'array'));
  E.assign(run, a.uid, 'array', 2);
  E.settle(run);
  assert.equal(run.array.length, 5); assert.equal(run.array[2].uid, a.uid);
});

test('a pending drafted card can be moved before activation and its order survives resume', () => {
  const save = make(); save.run.array = items('sun'); E.open(save.run);
  const c = save.run.pack[0]; E.assign(save.run, c.uid, 'array');
  E.move(save.run, c.uid, -1);
  assert.equal(E.projected(save.run).array[0].uid, c.uid);
  const resumed = JSON.parse(JSON.stringify(save));
  assert.equal(E.validSave(resumed), true);
  E.settle(resumed.run);
  assert.equal(resumed.run.array[0].uid, c.uid);
  assert.equal(resumed.run.array.length, 2);
});

test('array order, trigger bounds and the two boss debuffs affect actual score', () => {
  const { run } = make();
  assert.equal(E.score(run, items('sun', 'star')).total, 19);
  assert.equal(E.score(run, items('star', 'sun')).total, 12);
  assert.equal(E.score(run, items('magician', 'sun', 'star')).total, 38);
  assert.equal(E.score(run, items('magician', 'priestess')).total, 0);
  run.stageId = 'dusk';
  assert.equal(E.score(run, items('sun', 'star')).total, 16);
  run.stageId = 'clock';
  assert.equal(E.score(run, items('magician', 'sun')).total, 18);
});

test('furnace capacity, pending deposits, fusion and extraction preserve card counts', () => {
  const { run } = make(); run.furnace = items('sun', 'moon', 'star'); E.open(run);
  assert.throws(() => E.assign(run, run.pack[0].uid, 'furnace'));
  const output = E.forge(run, run.furnace.slice(0, 2).map(c => c.uid));
  assert.equal(output.id, 'eclipse'); assert.equal(run.furnace.length, 2);
  assert.equal(run.forgeCount, 1);
  E.assign(run, run.pack[0].uid, 'furnace'); E.settle(run);
  assert.equal(run.furnace.length, 3);
  assert.throws(() => E.forge(run, [run.furnace[0].uid, run.furnace[0].uid]));
});

test('alchemy has deterministic pair recipes and a three-tag recipe', () => {
  assert.equal(E.recipe(items('sun', 'moon')).id, 'eclipse');
  assert.equal(E.recipe(items('star', 'star')).id, 'nova');
  assert.equal(E.recipe(items('sun', 'empress')).id, 'garden');
  assert.equal(E.recipe(items('magician', 'magician')).id, 'archmage');
  assert.equal(E.recipe(items('sun', 'star', 'magician')).id, 'oracle');
  assert.equal(E.recipe(items('sun', 'moon', 'empress')), null);
  assert.equal(E.recipe(items('sun', 'fool')).id, 'tower');
});

test('unfinished stages still extract one by default; only the backpack is eligible; no double claims', () => {
  const { profile, run } = make(); run.furnace = items('sun', 'sun', 'nova');
  E.finish(run); assert.equal(run.passed, false);
  assert.throws(() => E.extract(profile, run, run.furnace.map(c => c.uid)));
  assert.throws(() => E.extract(profile, run, [run.array[0].uid]));
  assert.throws(() => E.extract(profile, run, run.furnace.slice(0, 2).map(c => c.uid)));
  const next = E.extract(profile, run, [run.furnace[0].uid]);
  assert.equal(next.inventory.sun, profile.inventory.sun + 1);
  assert.equal(next.runs, profile.runs + 1);
  assert.throws(() => E.extract(next, run, []));
});

test('crafted cards can leave the backpack and contribute to this run without being duplicated', () => {
  const { profile, run } = make(); run.furnace = items('sun', 'moon');
  const result = E.forge(run, run.furnace.map(c => c.uid));
  assert.equal(result.id, 'eclipse');
  const before = E.score(run).total;
  E.deploy(run, result.uid);
  assert.equal(run.furnace.length, 0);
  assert.equal(run.array.filter(c => c.uid === result.uid).length, 1);
  assert.ok(E.score(run).total > before);
  E.finish(run);
  assert.throws(() => E.extract(profile, run, [result.uid]));
  assert.throws(() => E.deploy(run, result.uid));
});

test('backpack deployment requires a real stored card and validates full-array replacement atomically', () => {
  const { run } = make(); run.array = items('sun', 'moon', 'star', 'wheel', 'fool');
  run.furnace = [{ uid: 'bag-traveler', id: 'traveler' }];
  const before = E.clone(run);
  assert.throws(() => E.deploy(run, 'bag-traveler'));
  assert.deepEqual(run, before);
  assert.throws(() => E.deploy(run, 'missing', 0));
  E.deploy(run, 'bag-traveler', 2);
  assert.equal(run.array[2].id, 'traveler');
  assert.equal(run.furnace.length, 0);
  assert.equal(E.takeLimit(run), 2);
});

test('deployment clears a pending array pick, preserves the backpack pick, and never overflows', () => {
  const save = make(), { run } = save; E.open(run);
  run.furnace = [{ uid: 'saved-eclipse', id: 'eclipse' }];
  E.assign(run, run.pack[0].uid, 'array');
  E.assign(run, run.pack[1].uid, 'furnace');
  E.move(run, run.pack[0].uid, -1);
  E.deploy(run, 'saved-eclipse');
  assert.equal(run.picks.array, null);
  assert.equal(run.picks.furnace.uid, run.pack[1].uid);
  assert.equal(E.projected(run).array.length, 2);
  assert.equal(E.validSave(JSON.parse(JSON.stringify(save))), true);
  assert.throws(() => E.deploy(run, run.pack[1].uid));
  E.settle(run);
  assert.equal(run.furnace.length, 1);
});

test('carry allowance comes from active array effects, stacks to three, and is not multiplied by echoes', () => {
  const { run } = make(); run.furnace = items('traveler');
  assert.equal(E.takeLimit(run), 1);
  run.array = items('magician', 'traveler');
  assert.equal(E.takeLimit(run), 2);
  assert.equal(E.score(run).total, 8);
  run.array = items('traveler', 'traveler', 'traveler');
  assert.equal(E.takeLimit(run), 3);
  run.array = items('sun'); E.open(run);
  const traveler = run.pack[0]; traveler.id = 'traveler';
  E.assign(run, traveler.uid, 'array');
  assert.equal(E.takeLimit(run), 2);
  E.assign(run, traveler.uid, 'array');
  assert.equal(E.takeLimit(run), 1);
});

test('two active travelers allow extracting all three backpack cards and survive save/resume', () => {
  const save = make(), { run } = save;
  run.array = items('traveler', 'traveler');
  run.furnace = ['sun', 'moon', 'nova'].map((id, i) => ({ uid: `backpack-${i}`, id }));
  E.finish(run);
  const resumed = JSON.parse(JSON.stringify(save));
  assert.equal(E.validSave(resumed), true);
  const result = E.extract(resumed.profile, resumed.run, resumed.run.furnace.map(c => c.uid));
  assert.equal(result.inventory.sun, save.profile.inventory.sun + 1);
  assert.equal(result.inventory.nova, 1);
});

test('ending during a draft commits both picks and scores exactly once before checking the target', () => {
  const { profile, run } = make(); E.open(run);
  E.assign(run, run.pack[0].uid, 'array'); E.assign(run, run.pack[1].uid, 'furnace');
  run.total = 210;
  E.finish(run);
  assert.equal(run.passed, true); assert.equal(run.array.length, 2); assert.equal(run.furnace.length, 1);
  const result = E.extract(profile, run, [run.furnace[0].uid]);
  assert.ok(result.cleared.includes('gate'));
  assert.throws(() => E.finish(run));
});

test('JSON resume preserves the current pack, picks and future random sequence', () => {
  const save = make(); E.open(save.run); E.assign(save.run, save.run.pack[0].uid, 'furnace');
  const resumed = JSON.parse(JSON.stringify(save));
  assert.equal(E.validSave(resumed), true);
  E.settle(save.run); E.settle(resumed.run); E.open(save.run); E.open(resumed.run);
  assert.deepEqual(save, resumed);
  resumed.profile.inventory.sun = -1; assert.equal(E.validSave(resumed), false);
  assert.equal(E.validSave({}), false);
});
