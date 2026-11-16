/* A pack controls the eligible types; each draw is independent and may repeat. */
function cardsForPack(catalog, pack) {
  const allowed = new Set(pack.types);
  return catalog.cards.filter(card => allowed.has(card.type));
}

function drawCards(pool, count, random = Math.random) {
  if (!Array.isArray(pool) || !pool.length) throw new Error('A pack needs at least one eligible card.');
  if (!Number.isSafeInteger(count) || count < 1) throw new Error('The pack size must be a positive integer.');
  return Array.from({ length: count }, () => {
    const n = random();
    if (!Number.isFinite(n) || n < 0 || n >= 1) throw new Error('Random values must be in [0, 1).');
    return pool[Math.floor(n * pool.length)];
  });
}

/* Mixed packs reuse the visual profile belonging to the most common drawn type. */
function visualPackFor(catalog, pack, drawn, random = Math.random) {
  if (pack.visuals) return pack;
  if (!drawn.length) throw new Error('A mixed pack needs cards before its visuals can be chosen.');
  const counts = new Map();
  for (const card of drawn) counts.set(card.type, (counts.get(card.type) || 0) + 1);
  const max = Math.max(...counts.values());
  const leaders = [...counts].filter(([, count]) => count === max).map(([type]) => type);
  const leadingType = leaders[Math.floor(random() * leaders.length)];
  const profileId = catalog.types.find(type => type.id === leadingType)?.visualPack;
  const profile = catalog.packs.find(option => option.id === profileId);
  if (!profile?.visuals) throw new Error(`No visual pack configured for card type: ${leadingType}`);
  return profile;
}

if (typeof module !== 'undefined' && module.exports) module.exports = { cardsForPack, drawCards, visualPackFor };
