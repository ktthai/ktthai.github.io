import { getServer, SERVER_BOUNDS } from './playerStats.js';
import { specialItemMap, specialItemSets } from './specialItems.js';

export const SERVERS = SERVER_BOUNDS.map(([, name]) => name);
export const RACES = ['Human', 'Elf', 'Giant'];
export const GENDERS = ['Male', 'Female'];
export const specialSetsWithIcons = specialItemSets.map((s) => ({
  name: s.name,
  icon: `/items/${s.items[0]}.png`,
}));

export const LEVEL_BUCKETS = [
  { key: 'lt1k', label: 'Under 1K', max: 1000 },
  { key: '1k', label: '1K – 10K', max: 10000 },
  { key: '10k', label: '10K – 50K', max: 50000 },
  { key: '50k', label: '50K – 100K', max: 100000 },
  { key: '100k', label: '100K – 500K', max: 500000 },
  { key: '500k', label: '500K+', max: Infinity },
];

export const SEEN_OPTIONS = [
  { key: '24h', label: '24 hours', secs: 86400 },
  { key: '7d', label: '7 days', secs: 86400 * 7 },
  { key: '30d', label: '30 days', secs: 86400 * 30 },
  { key: '90d', label: '90 days', secs: 86400 * 90 },
];

export const ADDED_OPTIONS = [
  { key: 'today', label: 'Today', secs: 86400 },
  { key: 'week', label: 'This week', secs: 86400 * 7 },
  { key: 'month', label: 'This month', secs: 86400 * 30 },
];

export const ACTIVITY_DAYS = 30;

export const MARRIAGE_OPTIONS = [
  { key: 'married', label: 'Married', icon: 'mdi-ring' },
  { key: 'divorced', label: 'Divorced', icon: 'mdi-heart-broken-outline' },
  { key: 'single', label: 'No spouse', icon: 'mdi-account-outline' },
];

export const SCOPES = [
  { key: 'name', label: 'Name' },
  { key: 'guild', label: 'Guild' },
  { key: 'spouse', label: 'Spouse' },
  { key: 'item', label: 'Items & UIDs' },
  { key: 'race', label: 'Race' },
  { key: 'id', label: 'ID' },
];

export const defaultFilters = () => ({
  server: [],
  race: [],
  gender: [],
  level: [],
  sets: [],
  setMode: 'any',
  guild: [],
  guildNames: [],
  marriage: [],
  seen: [],
  added: [],
});

const levelBucket = (lv) => {
  for (const b of LEVEL_BUCKETS) if ((lv || 0) < b.max) return b.key;
  return LEVEL_BUCKETS[LEVEL_BUCKETS.length - 1].key;
};

const NO_BADGES = Object.freeze([]);
const NO_SETS = new Set();

// Lowercased item names, built once per data load and used to make each
// player's item search text on demand (only when someone searches items).
let lowerItemNames = new Map();
const itemSearchText = (p) => {
  if (p._itemsL === null) {
    let s = '';
    const eq = p.equipment;
    if (eq) {
      for (const uid in eq) {
        const d = eq[uid];
        s += ` ${lowerItemNames.get(typeof d === 'number' ? d : d.itemId) || ''} ${uid}`;
      }
    }
    p._itemsL = s;
  }
  return p._itemsL;
};

/** Precompute everything the filters need, once per data load. */
export function enrichPlayers(players, itemNames) {
  lowerItemNames = new Map();
  for (const k in itemNames) lowerItemNames.set(Number(k), itemNames[k].toLowerCase());

  return players.map((p) => {
    let badges = NO_BADGES;
    let sets = NO_SETS;
    const eq = p.equipment;
    if (eq) {
      for (const uid in eq) {
        const d = eq[uid];
        const id = typeof d === 'number' ? d : d.itemId;
        const setName = specialItemMap.get(id);
        if (!setName) continue;
        if (badges === NO_BADGES) {
          badges = [];
          sets = new Set();
        }
        if (badges.some((b) => b.itemId === id)) continue;
        sets.add(setName);
        badges.push({ itemId: id, set: setName, name: itemNames[id] || setName });
      }
    }
    const race = p.race || '';
    const space = race.indexOf(' ');
    const num = parseInt(p.id, 16);
    return {
      ...p,
      _num: num,
      _numS: String(num),
      _server: getServer(p.id),
      _race: space === -1 ? race || 'Unknown' : race.slice(0, space),
      _gender: space === -1 ? 'Unknown' : race.slice(space + 1),
      _level: levelBucket(p.totalLevel),
      _sets: sets,
      _badges: badges,
      _nameL: (p.name || '').toLowerCase(),
      _guildL: (p.guild || '').toLowerCase(),
      _marriage: p.spouse ? 'married' : p.previousSpouses?.length ? 'divorced' : 'single',
      _spouseL: (p.spouse || '').toLowerCase(),
      // Current + previous spouses, so search finds who someone was married to
      _spousesL: [p.spouse, ...(p.previousSpouses || []).map((s) => s.name)].filter(Boolean).join('\n').toLowerCase(),
      _raceL: race.toLowerCase(),
      _itemsL: null, // built lazily by itemSearchText()
    };
  });
}

const matchField = {
  name: (p, q) => p._nameL.includes(q),
  guild: (p, q) => p._guildL.includes(q),
  spouse: (p, q) => p._spousesL.includes(q),
  item: (p, q) => itemSearchText(p).includes(q),
  race: (p, q) => p._raceL.includes(q),
  id: (p, q) => p._numS.startsWith(q),
};

function buildPredicates(f, q, scope, now) {
  const preds = [];
  const inSet = (key, values, get) => {
    if (!values.length) return;
    const s = new Set(values);
    preds.push([key, (p) => s.has(get(p))]);
  };
  inSet('server', f.server, (p) => p._server);
  inSet('race', f.race, (p) => p._race);
  inSet('gender', f.gender, (p) => p._gender);
  inSet('level', f.level, (p) => p._level);
  inSet('guild', f.guild, (p) => (p.guild ? 'has' : 'none'));
  inSet('guildNames', f.guildNames, (p) => p.guild);
  inSet('marriage', f.marriage, (p) => p._marriage);
  if (f.sets.length) {
    const want = f.sets;
    preds.push([
      'sets',
      f.setMode === 'all'
        ? (p) => want.every((s) => p._sets.has(s))
        : (p) => want.some((s) => p._sets.has(s)),
    ]);
  }
  if (f.seen.length) {
    const secs = SEEN_OPTIONS.find((o) => o.key === f.seen[0]).secs;
    preds.push(['seen', (p) => now - p.lastSeen <= secs]);
  }
  if (f.added.length) {
    const secs = ADDED_OPTIONS.find((o) => o.key === f.added[0]).secs;
    preds.push(['added', (p) => p.firstSeen && now - p.firstSeen <= secs]);
  }
  if (q) {
    const fields = Object.keys(matchField).filter((k) => scope[k]);
    preds.push(['search', (p) => fields.some((k) => matchField[k](p, q))]);
  }
  return preds;
}

function tally(counts, p, only, now) {
  const all = only === null;
  if (all || only === 'server') counts.server[p._server] = (counts.server[p._server] || 0) + 1;
  if (all || only === 'race') counts.race[p._race] = (counts.race[p._race] || 0) + 1;
  if (all || only === 'gender') counts.gender[p._gender] = (counts.gender[p._gender] || 0) + 1;
  if (all || only === 'level') counts.level[p._level] = (counts.level[p._level] || 0) + 1;
  if (all || only === 'guild') {
    const k = p.guild ? 'has' : 'none';
    counts.guild[k] = (counts.guild[k] || 0) + 1;
  }
  if (all || only === 'marriage') counts.marriage[p._marriage] = (counts.marriage[p._marriage] || 0) + 1;
  if (all || only === 'sets') for (const s of p._sets) counts.sets[s] = (counts.sets[s] || 0) + 1;
  if (all || only === 'seen') {
    for (const o of SEEN_OPTIONS) if (now - p.lastSeen <= o.secs) counts.seen[o.key] = (counts.seen[o.key] || 0) + 1;
    const day = Math.floor((now - p.lastSeen) / 86400);
    if (day >= 0 && day < ACTIVITY_DAYS) counts.seenDays[day]++;
  }
  if (all || only === 'added') {
    if (p.firstSeen) {
      for (const o of ADDED_OPTIONS) if (now - p.firstSeen <= o.secs) counts.added[o.key] = (counts.added[o.key] || 0) + 1;
    }
  }
}

/**
 * Runs every filter in a single pass and returns the matching players plus
 * faceted counts: each facet's counts reflect all *other* active filters,
 * so you can see how many results a checkbox would add before ticking it.
 */
export function evaluate(players, filters, query, scope, now = Date.now() / 1000) {
  const q = query.trim().toLowerCase();
  const preds = buildPredicates(filters, q, scope, now);
  const counts = {
    server: {}, race: {}, gender: {}, level: {}, guild: {}, marriage: {}, sets: {}, seen: {}, added: {},
    seenDays: new Array(ACTIVITY_DAYS).fill(0), // index 0 = today
    setMode: { any: 0, all: 0 },
  };
  const wantSets = filters.sets;
  const scopeCounts = { name: 0, guild: 0, spouse: 0, item: 0, race: 0, id: 0 };
  const results = [];

  for (const p of players) {
    let fails = 0;
    let failKey = null;
    for (const [key, test] of preds) {
      if (!test(p)) {
        failKey = key;
        if (++fails > 1) break;
      }
    }
    if (fails > 1) continue;
    if (fails === 0) {
      results.push(p);
      tally(counts, p, null, now);
    } else {
      tally(counts, p, failKey, now);
    }
    if (wantSets.length && (fails === 0 || failKey === 'sets')) {
      if (wantSets.some((s) => p._sets.has(s))) counts.setMode.any++;
      if (wantSets.every((s) => p._sets.has(s))) counts.setMode.all++;
    }
    if (q && (fails === 0 || failKey === 'search')) {
      for (const k in matchField) if (matchField[k](p, q)) scopeCounts[k]++;
    }
  }
  return { results, counts, scopeCounts };
}

export function countActive(f) {
  return (
    f.server.length + f.race.length + f.gender.length + f.level.length + f.sets.length +
    f.guild.length + f.guildNames.length + f.marriage.length + f.seen.length + f.added.length
  );
}

export function relativeTime(unixSeconds) {
  if (!unixSeconds) return '—';
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 86400 * 365) return `${Math.floor(diff / (86400 * 30))}mo ago`;
  return `${Math.floor(diff / (86400 * 365))}y ago`;
}
