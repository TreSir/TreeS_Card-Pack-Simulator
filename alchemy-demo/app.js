(() => {
  'use strict';
  const E = ArcanaEngine, D = E.D, $ = s => document.querySelector(s);
  const KEY = 'arcana-alchemy-demo-v1';
  let save = { profile: E.initial(), run: null };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (E.validSave(parsed)) save = parsed;
      else storageWarning('旧试玩存档无法读取，已使用初始状态。原存档暂未覆盖。');
    }
  } catch { storageWarning('浏览器存储不可用。本次仍可试玩，关闭页面后可能无法保留进度。'); }
  let stageId = D.stages.find(s => !save.profile.cleared.includes(s.id))?.id || 'gate';
  let starter = '', forgeSelection = [], takeSelection = [], replacing = null, replacementSource = 'pack', busy = false, sound = false, confirmAction = null, freshPack = false;
  let toastTimer, audio;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const art = c => `assets/${E.card(typeof c === 'string' ? c : c.id).art}.jpg`;
  const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const format = n => Number(n).toLocaleString('zh-CN');
  function storageWarning(message) { const el = $('#storage-warning'); el.textContent = message; el.hidden = false; }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(save)); $('#storage-warning').hidden = true; }
    catch { storageWarning('存档写入失败。请保持此页面打开；本次操作尚未保存到浏览器。'); }
  }
  function notify(message) {
    $('#toast').textContent = message; $('#toast').classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2800);
  }
  function chime(note = 0, type = 'sine') {
    if (!sound) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
      const oscillator = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
      oscillator.type = type; oscillator.frequency.value = 261.63 * 2 ** (note / 12);
      gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(0.07, now + 0.015); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      oscillator.connect(gain).connect(audio.destination); oscillator.start(now); oscillator.stop(now + 0.36);
    } catch { /* Audio is optional. */ }
  }
  function tagClass(tag) { return ({ 倍率: 'mult', 触发: 'trigger', 炼金: 'alchemy', 效果: 'utility' })[tag] || ''; }
  function cardHTML(item, extra = '') {
    const c = E.card(item.id);
    return `<div class="card ${c.crafted ? 'crafted' : ''} ${extra}"><div class="card-art"><img src="${art(item)}" alt="${c.name}" draggable="false"><span class="card-roman">${c.roman}</span><span class="tag ${tagClass(c.tag)}">${c.tag}</span></div><div class="card-copy"><div class="card-title"><strong>${c.name}</strong><small>${c.crafted ? '✦' : '✧'}</small></div><p class="card-text">${c.text}</p></div></div>`;
  }
  const footer = () => `<footer class="demo-footer"><span>ARCANA · 独立玩法试玩 v0.2</span><span>进度保存在当前浏览器</span></footer>`;
  function lobbyHTML() {
    const p = save.profile, entries = D.cards.filter(c => p.inventory[c.id] > 0), total = Object.values(p.inventory).reduce((a, b) => a + b, 0);
    const chosen = D.stages.find(s => s.id === stageId);
    return `<div class="lobby"><section class="lobby-top"><div class="intro"><span class="eyebrow">THE ALCHEMIST'S TABLE</span><h1>下一张，<br>会是你的<em>新可能</em>。</h1><p>打开卡包，让阵列运转。把眼前的好牌投入试炼，<br>或留在背包中，炼成下一局的起点。</p></div><div class="hero-art" aria-hidden="true"><img src="${art('sun')}" alt=""><img src="${art('moon')}" alt=""><img src="${art('magician')}" alt=""></div></section>
      <section><div class="section-heading"><h2>选择试炼 <span>每局六包 · 默认带回一张</span></h2><span class="fine">已通过 ${p.cleared.length} / ${D.stages.length}</span></div><div class="stage-list">${D.stages.map((s, i) => {
        const locked = i > 0 && !p.cleared.includes(D.stages[i - 1].id), cleared = p.cleared.includes(s.id);
        return `<button class="stage-choice ${s.id === stageId ? 'selected' : ''} ${locked ? 'locked' : ''}" data-action="stage" data-id="${s.id}" ${locked ? 'disabled' : ''} aria-pressed="${s.id === stageId}"><span class="stage-symbol">${s.mark}</span><span><span class="stage-meta">${s.subtitle}</span><h3>${s.name}</h3><p>${locked ? '通过上一关后解锁' : s.curse}</p><span class="stage-meta">目标 ${s.target} 分${p.best[s.id] ? ` · 最佳 ${format(p.best[s.id])}` : ''}</span></span>${cleared ? '<span class="check">✓</span>' : ''}</button>`;
      }).join('')}</div></section>
      <section class="lobby-bottom"><div class="stock-panel"><div class="section-heading"><h2>我的仓库 <span>${total} 张</span></h2><span class="fine">选一张起手</span></div><div class="stock-grid"><button class="stock-card loan-card ${starter === '' ? 'selected' : ''}" data-action="starter" data-id="" aria-pressed="${starter === ''}"><span class="loan-icon">✧</span><span><strong>基础愚者</strong><small>免费使用 · 无需库存</small></span></button>${entries.map(c => `<button class="stock-card ${starter === c.id ? 'selected' : ''}" data-action="starter" data-id="${c.id}" title="${c.text}" aria-pressed="${starter === c.id}"><img src="${art(c.id)}" alt=""><span><strong>${c.name}</strong><small>${c.tag}${c.crafted ? ' · 炼成' : ''}</small></span><span class="count">×${p.inventory[c.id]}</span></button>`).join('')}</div><p class="stock-footer">投入仓库牌会消耗 1 张。带出的牌按实际数量入库，同名牌可以重复持有。</p></div><div class="start-panel"><div><p class="eyebrow">READY WHEN YOU ARE</p><p class="selected-starter">${starter ? `投入「${E.card(starter).name}」` : '带着愚者，轻装开局'}</p><p>${starter ? E.card(starter).text : '＋6 分；每个空阵位额外＋4 分。'}<br>本次挑战：${chosen.name} · ${chosen.target} 分</p></div><button class="primary wide" data-action="start">进入试炼 <span aria-hidden="true">→</span></button></div></section>
      <footer class="demo-footer"><span>ARCANA · 独立玩法试玩 v0.2</span><button class="quiet" data-action="reset">重置试玩存档</button></footer></div>`;
  }
  function boardHTML(r) {
    const projected = E.projected(r), preview = E.score(r), s = D.stages.find(x => x.id === r.stageId);
    return `<div class="game"><section class="dashboard"><div class="boss-info"><div class="boss-medallion" aria-hidden="true">${s.mark}</div><div class="boss-copy"><span class="eyebrow">${s.subtitle} · ${s.boss}</span><h1>${s.name}</h1><p>${s.curse}</p></div></div><div class="score-area"><div class="score-heading"><span class="score-number"><span id="score-value">${format(r.total)}</span> <small>/ ${s.target}</small></span><span class="score-target" id="score-status">${r.total >= s.target ? '✓ 已达标，可继续完善收获' : `距离过关还差 ${format(s.target - r.total)} 分`}</span></div><div class="progress" role="progressbar" aria-label="通关进度" aria-valuenow="${Math.min(r.total, s.target)}" aria-valuemin="0" aria-valuemax="${s.target}"><i id="score-progress" style="width:${Math.min(100, r.total / s.target * 100)}%"></i></div></div><div class="round-info"><strong>${r.round}<span class="muted"> / ${s.rounds}</span></strong><p>已开卡包${r.phase === 'draft' ? ' · 本包待发动' : ''}</p><div class="round-dots">${Array.from({ length: s.rounds }, (_, i) => `<i class="${i < r.round ? (i === r.round - 1 && r.phase === 'draft' ? 'current' : 'done') : ''}"></i>`).join('')}</div></div></section>
      <div class="table-layout"><div class="table-left"><section class="array-section"><div class="section-label"><h2>我的阵列 <span>${projected.array.length} / 5</span></h2><span class="tip ${replacing ? 'swap-hint' : ''}">${replacing ? '点击下方阵位，替换其中一张' : '从左到右发动 →'}</span></div><div class="array-row">${Array.from({ length: 5 }, (_, i) => {
        const item = projected.array[i], pending = !!item && item.uid === r.picks.array?.uid;
        const replaceIndex = pending ? r.picks.array.index : r.array.findIndex(c => c.uid === item?.uid);
        return `<div class="slot ${replacing ? 'replace-target' : ''}" ${replacing ? `data-action="replace" data-index="${replaceIndex}" role="button" tabindex="0" aria-label="替换第 ${i + 1} 个阵位"` : ''} data-slot="${i}"><span class="slot-number">0${i + 1}</span>${item ? `${cardHTML(item)}${pending ? '<span class="pending-badge">本包待入阵</span>' : ''}<div class="move-controls"><button data-action="move" data-uid="${item.uid}" data-delta="-1" aria-label="${E.card(item.id).name}左移" ${i === 0 ? 'disabled' : ''}>‹</button><button data-action="move" data-uid="${item.uid}" data-delta="1" aria-label="${E.card(item.id).name}右移" ${i === projected.array.length - 1 ? 'disabled' : ''}>›</button></div>` : `<div class="slot-empty"><b>✧</b><span>等待一张牌</span></div>`}</div>`;
      }).join('')}</div><div class="array-footer"><div class="score-flash" id="score-flash">${replacing ? '<button class="cancel-placement" data-action="cancel-replace">取消替换</button>' : '<span>排列相同的牌，也能得到不同的结果。</span>'}</div><span class="preview-score">${format(preview.total)} <small>分 / 阵列预览</small></span></div></section>
      <section class="pack-section"><div class="section-label"><h2>${r.phase === 'draft' ? `第 ${r.round} 包 · 选择你的去向` : '下一次可能，仍在包中'}</h2>${r.phase === 'draft' ? `<div class="pack-labels"><span class="${r.picks.array ? 'filled' : ''}">入阵 ${r.picks.array ? '1' : '0'}/1</span><span class="${r.picks.furnace ? 'filled' : ''}">入包 ${r.picks.furnace ? '1' : '0'}/1</span></div>` : '<span class="tip">每包五张</span>'}</div>
      ${r.phase === 'draft' ? `<div class="pack-row ${freshPack ? 'fresh' : ''}">${r.pack.map((item, i) => {
        const a = r.picks.array?.uid === item.uid, f = r.picks.furnace?.uid === item.uid;
        return `<div style="--i:${i}" class="card ${E.card(item.id).crafted ? 'crafted' : ''} ${a ? 'selected-array' : ''} ${f ? 'selected-furnace' : ''}">${cardHTML(item).replace(/^<div class="card[^"]*">/, '').replace(/<\/div>$/, '')}<div class="card-actions"><button class="${a ? 'chosen' : ''}" data-action="assign-array" data-uid="${item.uid}" aria-pressed="${a}">${a ? '✓ 待入阵' : '＋ 入阵'}</button><button class="${f ? 'chosen' : ''}" data-action="assign-furnace" data-uid="${item.uid}" aria-pressed="${f}" ${r.furnace.length >= 3 && !f ? 'disabled' : ''}>${f ? '✓ 待入包' : '◇ 入包'}</button></div></div>`;
      }).join('')}</div>` : `<div class="pack-placeholder"><div class="booster" aria-hidden="true"><strong>ARCANA</strong><span class="seal">✧</span><small>FIVE POSSIBILITIES</small></div><div class="pack-message"><span class="eyebrow">${r.round === 0 ? 'YOUR FIRST PACK' : r.round < s.rounds ? 'ONE MORE POSSIBILITY' : 'TIME TO TAKE SOMETHING HOME'}</span><h3>${r.round === 0 ? '先打开，再做打算。' : r.round < s.rounds ? `本轮获得 ${format(r.last?.total || 0)} 分` : '六包已尽，留下你的收获。'}</h3><p>${r.round === 0 ? '每包选一张构筑阵列，另一张留进随身背包。好牌该用，还是该留？' : r.round < s.rounds ? '可以先调整阵列、炼制背包中的牌，再打开下一包。' : '还可以炼金。结算后，从随身背包中按当前上限选择带出。'}</p>${r.round < s.rounds ? `<button class="primary" data-action="open">${r.round === 0 ? '撕开第一包' : '打开下一包'} <span aria-hidden="true">↗</span></button>` : '<button class="primary" data-action="finish">结束并选择带出 →</button>'}</div></div>`}</section>
      <div class="turn-actions"><p class="fine">${r.phase === 'draft' ? '选择可随时改。确认发动后，未选卡牌会被舍弃。' : `本局已炼金 ${r.forgeCount} 次 · ${r.loan ? '基础愚者起手' : '已消耗一张仓库起手牌'}`}</p><div class="action-group">${r.phase === 'draft' ? '<button class="secondary" data-action="finish">发动并结束</button><button class="primary" data-action="settle">确认选择 · 发动阵列 →</button>' : r.round < s.rounds ? '<button class="secondary" data-action="finish">结束并选择带出</button>' : ''}</div></div></div>
      ${furnaceHTML(r)}
      </div>${footer()}</div>`;
  }
  function furnaceHTML(r) {
    forgeSelection = forgeSelection.filter(uid => r.furnace.some(c => c.uid === uid));
    const items = forgeSelection.map(uid => r.furnace.find(c => c.uid === uid)), recipe = E.recipe(items), result = recipe ? E.card(recipe.id) : null;
    const pending = r.picks.furnace ? r.pack.find(c => c.uid === r.picks.furnace.uid) : null;
    return `<aside class="side-panel"><div class="furnace-heading"><h2><b>◇</b>随身背包</h2><span>${r.furnace.length + Number(!!pending)} / 3</span></div><p class="fine">留下收藏，或投入阵列。</p><div class="carry-limit"><span>本局带出上限</span><strong>${E.takeLimit(r)} <small>/ ${D.maxTakeLimit} 张</small></strong></div><div class="furnace-list">${Array.from({ length: 3 }, (_, i) => {
      const item = r.furnace[i] || (i === r.furnace.length ? pending : null);
      if (!item) return '<div class="furnace-slot">◇ 留一个可能</div>';
      const c = E.card(item.id), isPending = item === pending, selected = forgeSelection.includes(item.uid);
      return `<${isPending ? 'div' : 'button'} class="furnace-card ${selected ? 'selected' : ''} ${isPending ? 'pending-furnace' : ''}" ${isPending ? '' : `data-action="forge-select" data-uid="${item.uid}" aria-pressed="${selected}"`}><img src="${art(item)}" alt=""><span><strong>${c.name}${c.crafted ? ' ✦' : ''}</strong><small>${c.tag} · ${c.text}</small></span><span class="selection-dot">${isPending ? '待存入' : selected ? '✓' : ''}</span></${isPending ? 'div' : 'button'}>`;
    }).join('')}</div><div class="recipe-area"><span class="eyebrow">CHOOSE ITS PURPOSE</span>${result ? `<div class="recipe-preview"><span class="recipe-symbol">${recipe.special ? '✦' : '△'}</span><div><strong>${result.name}${recipe.special ? ' · 特殊配方' : ' · 基础炼成'}</strong><p>${result.text}</p></div></div>` : `<p class="recipe-empty">${forgeSelection.length === 1 ? '可以直接上阵；再选一张可预览合成。' : forgeSelection.length === 3 ? '三张材料的标签需各不相同。' : r.furnace.length ? '选一张可以上阵，选两张可以合成。' : '确认发动后，选中的牌会正式存入背包。'}</p>`}<button class="secondary deploy-button wide" data-action="deploy" ${forgeSelection.length !== 1 ? 'disabled' : ''}>将所选放入阵列 →</button><p class="deployment-note">上阵后离开背包，无法再带走。</p><div class="forge-buttons"><button class="primary" data-action="forge" ${!result ? 'disabled' : ''}>合成${result ? `「${result.name}」` : ''}</button><button class="quiet" data-action="discard" ${forgeSelection.length !== 1 ? 'disabled' : ''}>移除所选</button></div></div>
      <details class="recipe-book"><summary>配方笔记</summary><p>太阳 ＋ 月亮 → 日蚀<br>太阳 ＋ 皇后 → 永昼花园<br>星星 ＋ 星星 → 新星<br>魔术师 ＋ 魔术师 → 大魔术师<br>三张不同标签 → 贤者之石<br>其他两张：同为倍率 → 星星；同为触发 → 魔术师；其余 → 高塔。<br><br>合成结果留在背包，可上阵或带出。旅人在阵列中每张增加 1 个带出名额，最多 3 张。</p></details>
      <div class="log-panel"><h3>上轮回响</h3><div class="log-list">${r.last ? r.last.events.map(e => `<div class="log-item"><span>${e.name} · ${e.label}</span><b>${format(e.after)}</b></div>`).join('') : '<p class="fine">阵列即将第一次苏醒。</p>'}</div></div></aside>`;
  }
  function extractionHTML(r) {
    const s = D.stages.find(x => x.id === r.stageId), limit = E.takeLimit(r);
    return `<div class="result"><section class="result-top"><div class="result-seal">${r.passed ? '✦' : '◇'}</div><span class="eyebrow">${r.passed ? 'TRIAL COMPLETE' : 'SOMETHING TO BRING HOME'}</span><h1>${r.passed ? '试炼通过，留下新的可能。' : '这次未过关，也能留下收获。'}</h1><p>${r.passed ? `${s.name}已达标。下一关将在入库后解锁。` : `${s.name}需要 ${s.target} 分。带回一张新起手，下次再试。`}</p><div class="result-stats"><div><strong>${format(r.total)}</strong><small>本局累计分</small></div><div><strong>${r.round}</strong><small>打开卡包</small></div><div><strong>${r.forgeCount}</strong><small>完成炼金</small></div></div></section><section class="extraction"><div class="section-heading"><h2>从背包中，选择你的收获</h2><span class="gold">已选 ${takeSelection.length} / ${limit}</span></div><div class="extraction-grid">${r.furnace.length ? r.furnace.map(item => `<button class="take-card ${takeSelection.includes(item.uid) ? 'selected' : ''}" data-action="take" data-uid="${item.uid}" aria-pressed="${takeSelection.includes(item.uid)}"><span class="take-check">${takeSelection.includes(item.uid) ? '✓' : ''}</span>${cardHTML(item)}</button>`).join('') : '<p class="empty-extraction">随身背包是空的。<br>下次开包时，记得留一张想带回家的牌。</p>'}</div><div class="extraction-footer"><p>默认带出 1 张；阵列中的旅人每张增加 1 个名额，上限 3 张。本局可带出 ${limit} 张。确认后，阵列及所有未选卡牌都会消耗；已选卡牌按数量进入仓库。</p><button class="primary" data-action="extract">${takeSelection.length ? `带回 ${takeSelection.length} 张 · 返回仓库` : '不带出 · 返回仓库'} →</button></div></section>${footer()}</div>`;
  }
  function render() {
    $('#app').innerHTML = !save.run ? lobbyHTML() : save.run.phase === 'extraction' ? extractionHTML(save.run) : boardHTML(save.run);
    freshPack = false;
    document.body.classList.toggle('busy', busy);
    $('#app').setAttribute('aria-busy', String(busy));
  }
  function confirm(title, text, action) {
    $('#confirm-title').textContent = title; $('#confirm-text').textContent = text; confirmAction = action; $('#confirm-dialog').showModal();
  }
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function animate(result) {
    const r = save.run, s = D.stages.find(x => x.id === r.stageId), base = r.total - result.total;
    busy = true; render();
    $('#score-value').textContent = format(base);
    $('#score-progress').style.width = `${Math.min(100, base / s.target * 100)}%`;
    for (let i = 0; i < result.events.length; i++) {
      if (save.run !== r || r.phase === 'extraction') return;
      const event = result.events[i];
      document.querySelectorAll('.slot.active').forEach(el => el.classList.remove('active'));
      $(`[data-slot="${event.index}"]`)?.classList.add('active');
      $('#score-flash').innerHTML = `<span>${event.name}</span><strong>${event.label}</strong>`;
      $('#score-value').textContent = format(base + event.after);
      $('#score-progress').style.width = `${Math.min(100, (base + event.after) / s.target * 100)}%`;
      chime([0, 4, 7, 12, 16, 19, 24][i % 7]);
      await pause(reduced ? 0 : 260);
    }
    await pause(reduced ? 0 : 230);
    busy = false; render();
    if (base < s.target && r.total >= s.target) notify('目标已达成！可以继续开包，或带着收获结束。');
  }
  async function handle(action, el) {
    if (busy) return;
    const r = save.run;
    if (action === 'help') { $('#help-dialog').showModal(); return; }
    if (action === 'close-help') { $('#help-dialog').close(); return; }
    if (action === 'sound') { sound = !sound; $('#sound-button').textContent = `音效 ${sound ? '开' : '关'}`; $('#sound-button').setAttribute('aria-label', `${sound ? '关闭' : '开启'}音效`); chime(12); return; }
    if (action === 'cancel-confirm') { $('#confirm-dialog').close(); confirmAction = null; return; }
    if (action === 'accept-confirm') { const fn = confirmAction; $('#confirm-dialog').close(); confirmAction = null; fn?.(); return; }
    if (action === 'stage') { stageId = el.dataset.id; render(); return; }
    if (action === 'starter') { starter = el.dataset.id; render(); return; }
    if (action === 'reset') {
      confirm('重置这份试玩存档？', '试玩仓库、过关记录和当前牌局将清空，并恢复初始赠牌。原开包项目不受影响。', () => { save = { profile: E.initial(), run: null }; starter = ''; stageId = 'gate'; persist(); render(); notify('试玩存档已重置'); }); return;
    }
    if (action === 'start') {
      const seed = crypto.getRandomValues(new Uint32Array(1))[0];
      save = E.start(save.profile, stageId, starter || null, seed);
      forgeSelection = []; takeSelection = []; replacing = null; persist(); render(); window.scrollTo({ top: 0 }); chime(0); return;
    }
    if (!r) return;
    if (action === 'open') {
      E.open(r); replacing = null; persist(); busy = true;
      document.body.classList.add('busy'); $('#app').setAttribute('aria-busy', 'true');
      $('.booster')?.classList.add('opening'); chime(7);
      await pause(reduced ? 0 : 440);
      busy = false; freshPack = true; render(); return;
    }
    if (action === 'assign-array') {
      replacementSource = 'pack';
      if (r.array.length === 5 && r.picks.array?.uid !== el.dataset.uid) { replacing = el.dataset.uid; render(); notify('点击阵列中的一张牌，选择替换位置'); return; }
      E.assign(r, el.dataset.uid, 'array'); replacing = null;
    } else if (action === 'replace') {
      if (replacementSource === 'backpack') { E.deploy(r, replacing, Number(el.dataset.index)); forgeSelection = []; }
      else E.assign(r, replacing, 'array', Number(el.dataset.index));
      replacing = null;
    }
    else if (action === 'cancel-replace') replacing = null;
    else if (action === 'assign-furnace') { E.assign(r, el.dataset.uid, 'furnace'); if (replacing === el.dataset.uid) replacing = null; }
    else if (action === 'move') E.move(r, el.dataset.uid, Number(el.dataset.delta));
    else if (action === 'settle') {
      replacing = null; const result = E.settle(r); persist(); await animate(result); return;
    } else if (action === 'forge-select') {
      const uid = el.dataset.uid; forgeSelection = forgeSelection.includes(uid) ? forgeSelection.filter(x => x !== uid) : [...forgeSelection, uid];
    } else if (action === 'forge') {
      const item = E.forge(r, forgeSelection); forgeSelection = []; persist(); render();
      $('.side-panel')?.classList.add('forge-glow'); chime(12); setTimeout(() => chime(19), 130); notify(`炼成「${E.card(item.id).name}」！已放入背包，可直接上阵或留着带出。`); return;
    } else if (action === 'deploy') {
      const uid = forgeSelection[0];
      if (r.array.length >= D.arraySize) { replacing = uid; replacementSource = 'backpack'; render(); notify('点击一个阵位进行替换；上阵后该牌将离开背包'); return; }
      const hadPick = !!r.picks.array;
      const item = E.deploy(r, uid); forgeSelection = []; replacing = null; persist(); render();
      notify(`「${E.card(item.id).name}」已上阵，不再占用背包${hadPick ? '；本包待入阵选择已取消' : ''}`); return;
    } else if (action === 'discard') {
      const uid = forgeSelection[0], item = r.furnace.find(x => x.uid === uid);
      confirm(`移除「${E.card(item.id).name}」？`, '这张牌会被消耗，腾出一个背包位置。此操作无法撤销。', () => { E.discard(r, uid); forgeSelection = []; persist(); render(); }); return;
    } else if (action === 'finish') {
      replacing = null; E.finish(r); forgeSelection = []; takeSelection = []; persist(); render(); window.scrollTo({ top: 0 }); return;
    } else if (action === 'take') {
      const uid = el.dataset.uid;
      if (takeSelection.includes(uid)) takeSelection = takeSelection.filter(x => x !== uid);
      else { if (takeSelection.length >= E.takeLimit(r)) { notify(`本局最多带回 ${E.takeLimit(r)} 张，请先取消一张`); return; } takeSelection.push(uid); }
    } else if (action === 'extract') {
      const commit = () => {
        const count = takeSelection.length, passed = r.passed, currentStage = r.stageId;
        save.profile = E.extract(save.profile, r, takeSelection); save.run = null; starter = ''; takeSelection = [];
        const index = D.stages.findIndex(x => x.id === currentStage);
        stageId = passed ? D.stages[Math.min(index + 1, D.stages.length - 1)].id : currentStage;
        persist(); render(); window.scrollTo({ top: 0 }); notify(`已带回 ${count} 张牌${passed ? '，关卡通过！' : '，可以调整起手再次挑战。'}`);
      };
      if (!takeSelection.length && r.furnace.length) { confirm('这次不带走卡牌？', '背包中还有卡牌。确定后，它们会随本局结束而消耗。', commit); return; }
      commit(); return;
    }
    persist(); render(); chime(4);
  }
  document.addEventListener('click', event => {
    const el = event.target.closest('[data-action]');
    if (!el || el.disabled) return;
    handle(el.dataset.action, el).catch(error => { busy = false; render(); notify(error.message || '操作未完成，请重试'); console.error(error); });
  });
  document.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.slot[role="button"]')) { event.preventDefault(); event.target.click(); }
  });
  $('#confirm-dialog').addEventListener('cancel', () => { confirmAction = null; });
  window.addEventListener('storage', event => {
    if (event.key === KEY) {
      // Avoid two tabs spending the same persistent inventory independently.
      try { const updated = JSON.parse(event.newValue); if (E.validSave(updated)) { save = updated; forgeSelection = []; takeSelection = []; replacing = null; busy = false; render(); notify('已同步另一个试玩页面的进度'); } } catch { /* Keep the valid in-memory state. */ }
    }
  });
  render();
})();
