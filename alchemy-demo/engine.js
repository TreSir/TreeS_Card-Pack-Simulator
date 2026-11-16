(function (root) {
  const D = typeof module !== 'undefined' && module.exports ? require('./data.js') : root.ArcanaData;
  const byId = Object.fromEntries(D.cards.map(c => [c.id, c]));
  const card = id => { if (!byId[id]) throw new Error('未知卡牌'); return byId[id]; };
  const clone = value => JSON.parse(JSON.stringify(value));
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const initial = () => ({ version: 1, inventory: { sun: 2, empress: 1, star: 1, magician: 1 }, cleared: [], best: {}, runs: 0, discovered: [] });
  function random(run) {
    let n = run.seed | 0;
    n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
    run.seed = n >>> 0;
    return run.seed / 4294967296;
  }
  function instance(run, id) { return { uid: `${run.id}-${++run.serial}`, id }; }
  function stage(run) { return D.stages.find(s => s.id === run.stageId); }
  function start(profile, stageId, starter, seed = Date.now()) {
    const index = D.stages.findIndex(s => s.id === stageId);
    assert(index >= 0 && (index === 0 || profile.cleared.includes(D.stages[index - 1].id)), '请先通过上一关');
    const next = clone(profile);
    if (starter) { card(starter); assert(next.inventory[starter] > 0, '仓库里没有这张牌'); next.inventory[starter]--; }
    const run = { id: `r${Date.now()}-${seed >>> 0}`, stageId, seed: (seed >>> 0) || 1, serial: 0, phase: 'between', round: 0, total: 0, array: [], furnace: [], pack: [], picks: { array: null, furnace: null }, forgeCount: 0, discovered: [], last: null, history: [] };
    run.array.push(instance(run, starter || 'fool'));
    run.loan = !starter;
    return { profile: next, run };
  }
  function open(run) {
    assert(run.phase === 'between' && run.round < stage(run).rounds, '现在不能开包');
    const pool = D.cards.filter(c => !c.crafted);
    const ids = [];
    const pick = list => {
      const sum = list.reduce((n, c) => n + c.weight, 0);
      let n = random(run) * sum;
      return list.find(c => (n -= c.weight) < 0) || list.at(-1);
    };
    for (let i = 0; i < 5; i++) {
      const eligible = pool.filter(c => ids.filter(id => id === c.id).length < 2);
      // A fixed safety net provides one directly scoring option, without picking a build for the player.
      const list = i === 4 && !ids.some(id => ['产分', '炼金'].includes(card(id).tag)) ? eligible.filter(c => c.tag === '产分') : eligible;
      ids.push(pick(list).id);
    }
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(random(run) * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    run.pack = ids.map(id => instance(run, id));
    run.round++; run.phase = 'draft'; run.picks = { array: null, furnace: null }; run.arrayOrder = null;
  }
  function assign(run, uid, destination, index = null) {
    assert(run.phase === 'draft', '请先开包');
    assert(['array', 'furnace'].includes(destination), '无效位置');
    assert(run.pack.some(c => c.uid === uid), '这张牌不在当前卡包');
    if (run.picks[destination]?.uid === uid) { run.picks[destination] = null; if (destination === 'array') run.arrayOrder = null; return; }
    if (destination === 'array' && run.array.length >= D.arraySize) assert(Number.isInteger(index) && index >= 0 && index < D.arraySize, '请选择要替换的阵位');
    if (destination === 'furnace') assert(run.furnace.length < D.backpackSize, '背包已满，请先合成、上阵或移除一张牌');
    const other = destination === 'array' ? 'furnace' : 'array';
    if (run.picks[other]?.uid === uid) { run.picks[other] = null; if (other === 'array') run.arrayOrder = null; }
    if (destination === 'array') run.arrayOrder = null;
    run.picks[destination] = { uid, index: destination === 'array' ? index : null };
  }
  function projected(run) {
    const array = clone(run.array), furnace = clone(run.furnace);
    for (const key of ['array', 'furnace']) {
      const p = run.picks[key];
      if (!p) continue;
      const c = run.pack.find(c => c.uid === p.uid);
      const list = key === 'array' ? array : furnace;
      if (key === 'array' && Number.isInteger(p.index)) list[p.index] = clone(c);
      else list.push(clone(c));
    }
    if (run.arrayOrder && run.arrayOrder.length === array.length && array.every(c => run.arrayOrder.includes(c.uid))) array.sort((a, b) => run.arrayOrder.indexOf(a.uid) - run.arrayOrder.indexOf(b.uid));
    return { array, furnace };
  }
  function move(run, uid, delta) {
    assert(['draft', 'between'].includes(run.phase), '本局已结算');
    assert([-1, 1].includes(delta), '无效移动');
    const array = projected(run).array;
    const i = array.findIndex(c => c.uid === uid), j = i + delta;
    assert(i >= 0 && j >= 0 && j < array.length, '已经到边缘');
    [array[i], array[j]] = [array[j], array[i]];
    if (run.phase === 'draft') run.arrayOrder = array.map(c => c.uid);
    else run.array = array;
  }
  function score(run, array = projected(run).array) {
    let total = 0;
    const events = [], boss = stage(run);
    function fire(item, index, echoed = false) {
      const c = card(item.id), before = total;
      const scale = echoed && boss.rule === 'echo' ? 0.5 : 1;
      let amount = c.value, label;
      if (c.tag === '触发') {
        if (echoed) return;
        const j = index + (c.effect === 'left' ? -1 : 1), neighbor = array[j];
        events.push({ index, uid: item.uid, name: c.name, before, after: total, label: neighbor && card(neighbor.id).tag !== '触发' ? `额外发动${card(neighbor.id).name} ×${c.value}` : '无可复制的邻牌' });
        if (neighbor && card(neighbor.id).tag !== '触发') for (let n = 0; n < c.value; n++) fire(neighbor, j, true);
        return;
      }
      if (c.effect === 'multiply') {
        const factor = 1 + (c.value - 1) * (boss.rule === 'multiplier' ? 0.5 : 1) * scale;
        total = Math.round(total * factor); label = `×${Number(factor.toFixed(3))}`;
      } else {
        if (c.effect === 'empty') amount += (D.arraySize - array.length) * 4;
        if (c.effect === 'growth' || c.effect === 'garden') amount += array.filter(x => x.uid !== item.uid && card(x.id).tag === '产分').length * (c.effect === 'garden' ? 5 : 3);
        if (c.effect === 'moon' && array.some(x => ['sun', 'eclipse'].includes(x.id))) amount = 22;
        if (c.effect === 'neighbors' && array[index - 1] && array[index + 1] && card(array[index - 1].id).tag === card(array[index + 1].id).tag) amount = 24;
        if (c.effect === 'forge') amount += run.forgeCount * 8;
        if (c.effect === 'oracle') amount += new Set(array.map(x => card(x.id).tag)).size * 8;
        amount = Math.round(amount * scale); total += amount; label = `＋${amount}`;
      }
      events.push({ index, uid: item.uid, name: c.name, before, after: total, label: `${echoed ? '回响 ' : ''}${label}` });
    }
    array.forEach((item, index) => fire(item, index));
    return { total, events };
  }
  function takeLimit(run) {
    const array = run.phase === 'draft' ? projected(run).array : run.array;
    return Math.min(D.maxTakeLimit, D.baseTakeLimit + array.reduce((n, item) => n + (card(item.id).carrySlots || 0), 0));
  }
  function deploy(run, uid, index = null) {
    assert(['draft', 'between'].includes(run.phase), '本局已结算');
    const item = run.furnace.find(c => c.uid === uid);
    assert(item, '只能将已存入背包的牌放入阵列');
    if (run.array.length >= D.arraySize) assert(Number.isInteger(index) && index >= 0 && index < D.arraySize, '请选择要替换的阵位');
    // Backpack deployment is immediate. An unconfirmed pack pick returns to the pack.
    run.picks.array = null; run.arrayOrder = null;
    run.furnace = run.furnace.filter(c => c.uid !== uid);
    if (run.array.length >= D.arraySize) run.array[index] = item;
    else run.array.push(item);
    return item;
  }
  function settle(run) {
    assert(run.phase === 'draft', '本包已经发动过');
    Object.assign(run, projected(run));
    run.picks = { array: null, furnace: null }; run.arrayOrder = null;
    run.last = score(run, run.array);
    run.total += run.last.total;
    run.history.push({ round: run.round, score: run.last.total, total: run.total });
    run.pack = []; run.phase = 'between';
    return clone(run.last);
  }
  function recipe(items) {
    if (items.length < 2 || items.length > 3) return null;
    const ids = items.map(x => x.id).sort();
    const known = D.recipes.find(r => [...r.ingredients].sort().join(',') === ids.join(','));
    if (known) return { id: known.result, special: true };
    if (items.length === 3 && new Set(ids.map(id => card(id).tag)).size === 3) return { id: 'oracle', special: true };
    if (items.length === 2) {
      const tags = items.map(x => card(x.id).tag);
      return { id: tags.every(x => x === '倍率') ? 'star' : tags.every(x => x === '触发') ? 'magician' : 'tower', special: false };
    }
    return null;
  }
  function forge(run, uids) {
    assert(['draft', 'between'].includes(run.phase), '本局已结算');
    assert(new Set(uids).size === uids.length, '材料不能重复选择');
    const ingredients = uids.map(uid => run.furnace.find(c => c.uid === uid));
    assert(ingredients.every(Boolean), '只能合成已存入背包的牌');
    const result = recipe(ingredients);
    assert(result, '选择两张材料，或三张标签各不相同的材料');
    run.furnace = run.furnace.filter(c => !uids.includes(c.uid));
    const output = instance(run, result.id);
    run.furnace.push(output); run.forgeCount++;
    if (!run.discovered.includes(output.id)) run.discovered.push(output.id);
    return output;
  }
  function discard(run, uid) {
    assert(['draft', 'between'].includes(run.phase), '本局已结算');
    assert(run.furnace.some(c => c.uid === uid), '卡牌不在背包中');
    run.furnace = run.furnace.filter(c => c.uid !== uid);
  }
  function finish(run) {
    assert(['draft', 'between'].includes(run.phase), '本局已结束');
    if (run.phase === 'draft') settle(run);
    run.phase = 'extraction';
    run.passed = run.total >= stage(run).target;
  }
  function extract(profile, run, uids) {
    assert(run.phase === 'extraction', '尚未进入带出结算');
    assert(uids.length <= takeLimit(run) && new Set(uids).size === uids.length, `本局最多带出 ${takeLimit(run)} 张不同的实体卡牌`);
    const chosen = uids.map(uid => run.furnace.find(c => c.uid === uid));
    assert(chosen.every(Boolean), '只能带出背包中的牌');
    const next = clone(profile);
    for (const c of chosen) next.inventory[c.id] = (next.inventory[c.id] || 0) + 1;
    if (run.passed && !next.cleared.includes(run.stageId)) next.cleared.push(run.stageId);
    next.best[run.stageId] = Math.max(next.best[run.stageId] || 0, run.total);
    next.discovered = [...new Set([...next.discovered, ...run.discovered])];
    next.runs++; run.phase = 'complete';
    return next;
  }
  function validSave(save) {
    try {
      const p = save.profile, r = save.run;
      if (p.version !== 1 || !p.inventory || typeof p.inventory !== 'object' || !Array.isArray(p.cleared) || !Array.isArray(p.discovered) || !p.best || !Number.isInteger(p.runs) || p.runs < 0) return false;
      if (!Object.entries(p.inventory).every(([id, count]) => byId[id] && Number.isSafeInteger(count) && count >= 0)) return false;
      if (!r) return true;
      if (!stage(r) || !['draft', 'between', 'extraction'].includes(r.phase) || !Number.isInteger(r.round) || r.round < 0 || r.round > stage(r).rounds || !Number.isFinite(r.total) || r.total < 0) return false;
      if (!Array.isArray(r.array) || !Array.isArray(r.furnace) || !Array.isArray(r.pack) || r.array.length > 5 || r.furnace.length > 3 || r.pack.length > 5) return false;
      const all = [...r.array, ...r.furnace, ...r.pack];
      if (!all.every(c => c && byId[c.id] && typeof c.uid === 'string') || new Set(all.map(c => c.uid)).size !== all.length) return false;
      if (!r.picks || !Number.isInteger(r.serial) || !Number.isInteger(r.seed) || !Number.isInteger(r.forgeCount) || r.forgeCount < 0 || !Array.isArray(r.discovered) || !Array.isArray(r.history)) return false;
      for (const key of ['array', 'furnace']) if (r.picks[key] && !r.pack.some(c => c.uid === r.picks[key].uid)) return false;
      if (r.picks.array && r.picks.furnace && r.picks.array.uid === r.picks.furnace.uid) return false;
      const projectedState = projected(r);
      return projectedState.array.length <= 5 && projectedState.furnace.length <= 3;
    } catch { return false; }
  }
  const api = { D, card, initial, start, open, assign, projected, move, score, takeLimit, deploy, settle, recipe, forge, discard, finish, extract, validSave, clone };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ArcanaEngine = api;
})(globalThis);
