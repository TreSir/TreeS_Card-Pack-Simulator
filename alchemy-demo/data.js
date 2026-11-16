(function (root) {
  const cards = [
    { id: 'fool', name: '愚者', roman: '0', art: 'the-fool', tag: '产分', effect: 'empty', value: 6, weight: 12, text: '＋6 分；每个空阵位额外＋4 分。' },
    { id: 'sun', name: '太阳', roman: 'XIX', art: 'the-sun', tag: '产分', effect: 'add', value: 12, weight: 14, text: '＋12 分。简单而可靠的光。' },
    { id: 'empress', name: '皇后', roman: 'III', art: 'the-empress', tag: '产分', effect: 'growth', value: 8, weight: 12, text: '＋8 分；每张其他产分牌额外＋3 分。' },
    { id: 'moon', name: '月亮', roman: 'XVIII', art: 'the-moon', tag: '产分', effect: 'moon', value: 6, weight: 10, text: '＋6 分；阵中有太阳或日蚀时，改为＋22 分。' },
    { id: 'star', name: '星星', roman: 'XVII', art: 'the-star-preview', tag: '倍率', effect: 'multiply', value: 1.6, weight: 9, text: '将此前累积的本轮分数 ×1.6。适合放后面。' },
    { id: 'wheel', name: '命运之轮', roman: 'X', art: 'the-wheel-of-fortune', tag: '倍率', effect: 'multiply', value: 1.35, weight: 10, text: '将此前累积的本轮分数 ×1.35。' },
    { id: 'magician', name: '魔术师', roman: 'I', art: 'the-magician', tag: '触发', effect: 'right', value: 1, weight: 8, text: '额外发动右邻牌 1 次。无法复制触发牌。' },
    { id: 'priestess', name: '女祭司', roman: 'II', art: 'the-high-priestess', tag: '触发', effect: 'left', value: 1, weight: 8, text: '额外发动左邻牌 1 次。无法复制触发牌。' },
    { id: 'lovers', name: '恋人', roman: 'VI', art: 'the-lovers', tag: '产分', effect: 'neighbors', value: 6, weight: 10, text: '＋6 分；左右邻牌标签相同时，改为＋24 分。' },
    { id: 'tower', name: '高塔', roman: 'XVI', art: 'the-tower', tag: '炼金', effect: 'forge', value: 10, weight: 9, text: '＋10 分；本局每次炼金额外＋8 分。' },
    { id: 'traveler', name: '旅人', roman: '0 · ✧', art: 'the-fool', tag: '效果', effect: 'add', value: 4, carrySlots: 1, weight: 8, text: '＋4 分。在阵列中时，带出上限＋1，最多带出 3 张。' },
    { id: 'eclipse', name: '日蚀', roman: '☉ ☾', art: 'the-moon', tag: '产分', effect: 'add', value: 32, crafted: true, text: '＋32 分。同时可以唤醒月亮。', flavor: '日与月交叠，新的光诞生。' },
    { id: 'nova', name: '新星', roman: '✦', art: 'the-star-preview', tag: '倍率', effect: 'multiply', value: 2.2, crafted: true, text: '将此前累积的本轮分数 ×2.2。', flavor: '两束星光，汇成一次爆发。' },
    { id: 'archmage', name: '大魔术师', roman: 'I · I', art: 'the-magician', tag: '触发', effect: 'right', value: 2, crafted: true, text: '额外发动右邻牌 2 次。无法复制触发牌。', flavor: '一次奇迹，再来一次。' },
    { id: 'garden', name: '永昼花园', roman: 'III · XIX', art: 'the-empress', tag: '产分', effect: 'garden', value: 18, crafted: true, text: '＋18 分；每张其他产分牌额外＋5 分。', flavor: '丰盛与光，永不凋零。' },
    { id: 'oracle', name: '贤者之石', roman: '△', art: 'the-high-priestess', tag: '炼金', effect: 'oracle', value: 12, crafted: true, text: '＋12 分；阵中每种标签额外＋8 分。', flavor: '不同的事物，找到了同一种语言。' },
  ];
  const stages = [
    { id: 'gate', name: '初启之门', boss: '守门人', mark: '☉', target: 210, rounds: 6, curse: '无额外限制。先让你的第一套阵列运转起来。', rule: 'none', subtitle: '第一章 · 试炼 01' },
    { id: 'dusk', name: '薄暮审判', boss: '吞光者', mark: '☾', target: 330, rounds: 6, curse: '所有倍率的增益减半。例如 ×1.6 变为 ×1.3。', rule: 'multiplier', subtitle: '第一章 · 试炼 02' },
    { id: 'clock', name: '停摆时刻', boss: '缚时者', mark: '◷', target: 400, rounds: 6, curse: '被额外发动的牌，其产分与倍率增益减半。', rule: 'echo', subtitle: '第一章 · 试炼 03' },
  ];
  const recipes = [
    { ingredients: ['sun', 'moon'], result: 'eclipse' },
    { ingredients: ['star', 'star'], result: 'nova' },
    { ingredients: ['magician', 'magician'], result: 'archmage' },
    { ingredients: ['sun', 'empress'], result: 'garden' },
  ];
  const data = { cards, stages, recipes, arraySize: 5, backpackSize: 3, baseTakeLimit: 1, maxTakeLimit: 3 };
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.ArcanaData = data;
})(globalThis);
