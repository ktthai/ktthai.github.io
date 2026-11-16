<template>
  <div class="nc">
    <!-- Command bar -->
    <header class="nc-bar">
      <div class="nc-bar-row">
        <div class="nc-heading">
          <h1>Name Changes</h1>
          <span class="nc-count">
            <strong>{{ filtered.length.toLocaleString() }}</strong>
            <template v-if="filtered.length !== rows.length"> of {{ rows.length.toLocaleString() }}</template>
          </span>
        </div>

        <label class="nc-search" :class="{ focused }">
          <v-icon size="20" class="nc-muted">mdi-magnify</v-icon>
          <input
            ref="searchEl"
            v-model="search"
            placeholder="Search any past or current name, or an ID…"
            spellcheck="false"
            @focus="focused = true"
            @blur="focused = false"
            @keydown.esc="search = ''"
          />
          <button v-if="search" class="nc-icon-btn" aria-label="Clear search" @click="search = ''">
            <v-icon size="16">mdi-close</v-icon>
          </button>
          <kbd v-else>/</kbd>
        </label>

        <v-menu location="bottom end" offset="6">
          <template #activator="{ props: menu }">
            <button v-bind="menu" class="nc-btn">
              <v-icon size="18">mdi-sort</v-icon>
              <span class="nc-muted">Sort</span>{{ SORTS.find((s) => s.key === sort).label }}
            </button>
          </template>
          <div class="nc-menu">
            <button
              v-for="s in SORTS"
              :key="s.key"
              class="nc-menu-item"
              :class="{ on: sort === s.key }"
              @click="sort = s.key"
            >
              <v-icon size="16">{{ s.icon }}</v-icon>{{ s.label }}
              <v-icon v-if="sort === s.key" size="16" class="nc-menu-check">mdi-check</v-icon>
            </button>
          </div>
        </v-menu>
      </div>

      <div class="nc-filters">
        <button
          v-for="s in serverCounts"
          :key="s.name"
          class="nc-pill"
          :class="{ on: servers.includes(s.name), empty: !s.count }"
          @click="toggleServer(s.name)"
        >
          {{ s.name }} <span>{{ s.count.toLocaleString() }}</span>
          <i class="nc-pill-bar" :style="{ width: `${(s.count / serverMax) * 100}%` }" />
        </button>
        <span class="nc-divider" />
        <button class="nc-pill" :class="{ on: multiOnly }" @click="multiOnly = !multiOnly">
          Renamed 2+ times <span>{{ multiCount.toLocaleString() }}</span>
        </button>
        <button class="nc-pill" :class="{ on: reclaimedOnly }" @click="reclaimedOnly = !reclaimedOnly">
          Took back an old name <span>{{ reclaimedCount.toLocaleString() }}</span>
        </button>
        <button v-if="hasFilters" class="nc-clear" @click="clearFilters">Clear</button>
      </div>

      <div class="nc-progress" aria-hidden="true">
        <div class="nc-progress-fill" :style="{ width: `${rows.length ? (filtered.length / rows.length) * 100 : 0}%` }" />
      </div>
    </header>

    <!-- List -->
    <section class="nc-list">
      <div class="nc-list-head">
        <span>Player</span>
        <span>Previous names</span>
        <span>Server</span>
        <span class="nc-right">Last seen</span>
      </div>

      <div v-if="!filtered.length" class="nc-empty">
        <v-icon size="36">mdi-account-search-outline</v-icon>
        <div class="nc-empty-title">No name changes match</div>
        <button class="nc-btn" @click="clearAll">Reset search and filters</button>
      </div>

      <button
        v-for="r in visible"
        :key="r.hex"
        class="nc-row"
        :title="r.player ? 'Open this player on the Players page' : 'Player not in the current cache'"
        :disabled="!r.player"
        @click="openPlayer(r)"
      >
        <div class="nc-player">
          <span class="nc-name"><Hl :text="r.current" :q="q" /></span>
          <span v-if="r.reclaimed" class="nc-tag">reclaimed</span>
          <span v-if="showIds" class="nc-id">#<Hl :text="String(r.num)" :q="q" prefix /></span>
        </div>

        <div class="nc-trail">
          <template v-for="(n, i) in r.previous" :key="i">
            <span class="nc-old"><Hl :text="n" :q="q" /></span>
            <v-icon v-if="i < r.previous.length - 1" size="12" class="nc-arrow">mdi-arrow-right</v-icon>
          </template>
        </div>

        <div class="nc-cell">{{ r.server }}</div>
        <div class="nc-cell nc-right" :title="r.lastSeen ? new Date(r.lastSeen * 1000).toLocaleString() : ''">
          {{ r.lastSeen ? relativeTime(r.lastSeen) : '—' }}
        </div>
      </button>

      <div v-if="filtered.length > limit" class="nc-more">
        <button class="nc-btn" @click="limit += PAGE">
          Show more <span class="nc-muted">{{ (filtered.length - limit).toLocaleString() }} left</span>
        </button>
      </div>
    </section>

    <div v-if="updated" class="nc-foot">Name changes last checked {{ updated }}</div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch, onMounted, onBeforeUnmount, h } from 'vue';
import { getServer } from '../utils/playerStats.js';
import { SERVERS, relativeTime } from '../utils/playerFilters.js';
import { showIds } from '../utils/preferences.js';

const PAGE = 60;
const SORTS = [
  { key: 'seen', label: 'Last seen', icon: 'mdi-clock-outline' },
  { key: 'renames', label: 'Most renames', icon: 'mdi-swap-horizontal' },
  { key: 'name', label: 'Name', icon: 'mdi-sort-alphabetical-ascending' },
  { key: 'id', label: 'ID', icon: 'mdi-pound' },
];

/** Renders text with the first match of q underlined (prefix = only match at the start). */
const Hl = (props) => {
  const { text = '', q = '', prefix = false } = props;
  const i = q ? text.toLowerCase().indexOf(q) : -1;
  if (i === -1 || (prefix && i !== 0)) return text;
  return [text.slice(0, i), h('mark', { class: 'nc-hl' }, text.slice(i, i + q.length)), text.slice(i + q.length)];
};
Hl.props = ['text', 'q', 'prefix'];

export default defineComponent({
  name: 'NameChangesView',
  components: { Hl },
  props: {
    nameChanges: { type: Object, required: true },
    players: { type: Array, default: () => [] },
  },
  emits: ['open-players'],
  setup(props, { emit }) {
    const search = ref('');
    const q = ref('');
    const focused = ref(false);
    const searchEl = ref(null);
    const sort = ref('seen');
    const servers = ref([]);
    const multiOnly = ref(false);
    const reclaimedOnly = ref(false);
    const limit = ref(PAGE);

    let t;
    watch(search, (v) => {
      clearTimeout(t);
      t = setTimeout(() => (q.value = v.trim().toLowerCase()), 150);
    });
    watch([q, sort, servers, multiOnly, reclaimedOnly], () => (limit.value = PAGE), { deep: true });

    const onKey = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        searchEl.value?.focus();
      }
    };
    onMounted(() => window.addEventListener('keydown', onKey));
    onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

    const byId = computed(() => {
      const m = new Map();
      for (const p of props.players) m.set(p.id, p);
      return m;
    });

    const rows = computed(() => {
      const changes = props.nameChanges?.changes || {};
      return Object.entries(changes).map(([hex, names]) => {
        const player = byId.value.get(hex);
        const current = names[names.length - 1];
        const num = parseInt(hex, 16);
        return {
          hex,
          num,
          player,
          current,
          previous: names.slice(0, -1),
          renames: names.length - 1,
          reclaimed: names.slice(0, -1).includes(current),
          server: getServer(hex),
          lastSeen: player?.lastSeen || 0,
          namesL: names.map((n) => n.toLowerCase()),
          numS: String(num),
        };
      });
    });

    const matchesSearch = (r) =>
      !q.value || r.namesL.some((n) => n.includes(q.value)) || r.numS.startsWith(q.value);
    const matchesToggles = (r) => (!multiOnly.value || r.renames > 1) && (!reclaimedOnly.value || r.reclaimed);

    // Server counts reflect the search and toggles, but not the server filter itself
    const serverCounts = computed(() => {
      const counts = Object.fromEntries(SERVERS.map((s) => [s, 0]));
      for (const r of rows.value) if (matchesSearch(r) && matchesToggles(r)) counts[r.server]++;
      return SERVERS.map((name) => ({ name, count: counts[name] }));
    });
    const serverMax = computed(() => Math.max(1, ...serverCounts.value.map((s) => s.count)));

    const inServer = (r) => !servers.value.length || servers.value.includes(r.server);
    const multiCount = computed(() => rows.value.filter((r) => r.renames > 1 && matchesSearch(r) && inServer(r)).length);
    const reclaimedCount = computed(() => rows.value.filter((r) => r.reclaimed && matchesSearch(r) && inServer(r)).length);

    const filtered = computed(() => {
      const list = rows.value.filter((r) => matchesSearch(r) && matchesToggles(r) && inServer(r));
      const cmp = {
        seen: (a, b) => b.lastSeen - a.lastSeen,
        renames: (a, b) => b.renames - a.renames || b.lastSeen - a.lastSeen,
        name: (a, b) => a.current.localeCompare(b.current, undefined, { sensitivity: 'base' }),
        id: (a, b) => a.num - b.num,
      }[sort.value];
      return list.sort(cmp);
    });
    const visible = computed(() => filtered.value.slice(0, limit.value));

    const toggleServer = (s) => {
      const i = servers.value.indexOf(s);
      i === -1 ? servers.value.push(s) : servers.value.splice(i, 1);
    };
    const hasFilters = computed(() => servers.value.length || multiOnly.value || reclaimedOnly.value);
    const clearFilters = () => {
      servers.value = [];
      multiOnly.value = false;
      reclaimedOnly.value = false;
    };
    const clearAll = () => {
      clearFilters();
      search.value = '';
    };

    const openPlayer = (r) => {
      if (r.player) emit('open-players', { filters: {}, search: String(r.num), scope: 'id' });
    };

    const updated = computed(() =>
      props.nameChanges?.lastUpdated ? relativeTime(props.nameChanges.lastUpdated) : ''
    );

    return {
      PAGE, SORTS, showIds, relativeTime,
      search, q, focused, searchEl, sort, servers, multiOnly, reclaimedOnly, limit,
      rows, filtered, visible, serverCounts, serverMax, multiCount, reclaimedCount,
      toggleServer, hasFilters, clearFilters, clearAll, openPlayer, updated,
    };
  },
});
</script>

<style scoped>
.nc { color: var(--mb-text); }
.nc-muted { color: var(--mb-text-3); }
.nc-right { text-align: right; justify-content: flex-end; }

/* ---------- command bar ---------- */
.nc-bar {
  position: sticky; top: 0; z-index: 20; overflow: hidden;
  padding: 14px 16px 12px; margin-bottom: 16px;
  border: 1px solid var(--mb-border); border-radius: 14px;
  background: rgba(21, 25, 34, 0.82); backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
}
.nc-bar-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.nc-heading { display: flex; align-items: baseline; gap: 10px; }
.nc-heading h1 { margin: 0; font-size: 1.35rem; font-weight: 700; letter-spacing: -0.02em; white-space: nowrap; }
.nc-count { font-size: 0.85rem; color: var(--mb-text-3); font-variant-numeric: tabular-nums; white-space: nowrap; }
.nc-count strong { color: var(--mb-text); font-weight: 600; }

.nc-search {
  flex: 1; min-width: 240px; display: flex; align-items: center; gap: 10px;
  height: 42px; padding: 0 12px; border-radius: 11px; cursor: text;
  background: rgba(148, 163, 184, 0.05); border: 1px solid var(--mb-border);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.nc-search.focused { border-color: rgba(var(--mb-accent-rgb), 0.7); box-shadow: 0 0 0 4px rgba(var(--mb-accent-rgb), 0.15); }
.nc-search input { flex: 1; min-width: 0; background: none; border: 0; outline: 0; color: var(--mb-text); font: inherit; font-size: 0.95rem; }
.nc-search input::placeholder { color: var(--mb-text-3); }
kbd {
  font-family: inherit; font-size: 0.72rem; color: var(--mb-text-3);
  padding: 1px 7px; border-radius: 5px; border: 1px solid var(--mb-border);
}

.nc-btn {
  display: inline-flex; align-items: center; gap: 7px; height: 38px; padding: 0 14px;
  border-radius: 10px; border: 1px solid var(--mb-border); background: var(--mb-surface);
  color: var(--mb-text); font: inherit; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: background 0.15s;
}
.nc-btn:hover { background: var(--mb-surface-2); }
.nc-icon-btn {
  display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px;
  border: 0; background: none; color: var(--mb-text-3); cursor: pointer;
}
.nc-icon-btn:hover { background: var(--mb-hover); color: var(--mb-text); }

.nc-menu {
  min-width: 200px; padding: 6px; border-radius: 12px;
  background: var(--mb-surface-2); border: 1px solid var(--mb-border); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
}
.nc-menu-item {
  width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 0; border-radius: 8px;
  background: none; cursor: pointer; font: inherit; font-size: 0.85rem; color: var(--mb-text-2); text-align: left;
}
.nc-menu-item:hover { background: var(--mb-hover); color: var(--mb-text); }
.nc-menu-item.on { color: var(--mb-text); }
.nc-menu-check { margin-left: auto; color: var(--mb-accent); }

.nc-filters { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 12px; }
.nc-pill {
  position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 6px;
  height: 28px; padding: 0 11px; border-radius: 999px; border: 1px solid var(--mb-border);
  background: transparent; color: var(--mb-text-2); font: inherit; font-size: 0.78rem; cursor: pointer; transition: all 0.15s;
}
.nc-pill span { font-variant-numeric: tabular-nums; color: var(--mb-text-3); }
.nc-pill:hover { color: var(--mb-text); }
.nc-pill.on { color: var(--mb-text); border-color: rgba(var(--mb-accent-rgb), 0.5); background: rgba(var(--mb-accent-rgb), 0.12); }
.nc-pill.empty { opacity: 0.45; }
.nc-pill-bar {
  position: absolute; left: 0; bottom: 0; height: 2px;
  background: rgba(var(--mb-accent-rgb), 0.35); transition: width 0.3s ease; pointer-events: none;
}
.nc-divider { width: 1px; height: 18px; background: var(--mb-border); margin: 0 4px; }
.nc-clear { border: 0; background: none; cursor: pointer; font: inherit; font-size: 0.78rem; color: var(--mb-text-3); margin-left: 2px; }
.nc-clear:hover { color: var(--mb-text); text-decoration: underline; }

.nc-progress { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; }
.nc-progress-fill {
  height: 100%; background: linear-gradient(90deg, rgba(var(--mb-accent-rgb), 0.15), rgba(var(--mb-accent-rgb), 0.6));
  transition: width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* ---------- list ---------- */
.nc-list { background: var(--mb-surface); border: 1px solid var(--mb-border); border-radius: 14px; overflow: hidden; }
.nc-list-head, .nc-row {
  display: grid; grid-template-columns: minmax(170px, 1fr) minmax(0, 2.5fr) 90px 90px;
  gap: 16px; align-items: center; padding: 0 18px;
}
.nc-list-head {
  height: 38px; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--mb-text-3); background: rgba(148, 163, 184, 0.02); border-bottom: 1px solid var(--mb-border);
}
.nc-row {
  width: 100%; min-height: 46px; border: 0; border-bottom: 1px solid var(--mb-border-soft);
  background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; transition: background 0.12s;
}
.nc-row:hover:not(:disabled) { background: var(--mb-hover); }
.nc-row:hover:not(:disabled) .nc-name { color: var(--mb-accent); }
.nc-row:disabled { cursor: default; opacity: 0.7; }
.nc-row:last-of-type { border-bottom: 0; }

.nc-player { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.nc-name { font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color 0.12s; }
.nc-id { font-family: var(--mb-mono); font-size: 0.74rem; color: var(--mb-text-3); white-space: nowrap; }
.nc-tag {
  font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
  padding: 1px 6px; border-radius: 4px; background: rgba(var(--mb-accent-rgb), 0.14); color: var(--mb-accent);
}

.nc-trail { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 6px; min-width: 0; padding: 6px 0; }
.nc-old { font-size: 0.84rem; color: var(--mb-text-2); }
.nc-arrow { color: var(--mb-text-3); opacity: 0.7; }

.nc-cell { font-size: 0.84rem; color: var(--mb-text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.nc :deep(.nc-hl) { background: rgba(var(--mb-accent-rgb), 0.14); color: inherit; border-radius: 2px; box-shadow: inset 0 -1.5px 0 rgba(var(--mb-accent-rgb), 0.7); }

.nc-more { display: flex; justify-content: center; padding: 14px; border-top: 1px solid var(--mb-border-soft); }
.nc-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 56px 16px; color: var(--mb-text-3); }
.nc-empty-title { color: var(--mb-text); font-weight: 600; }
.nc-foot { margin-top: 12px; padding: 0 4px; font-size: 0.75rem; color: var(--mb-text-3); }

@media (max-width: 760px) {
  .nc-list-head { display: none; }
  .nc-row { grid-template-columns: 1fr auto; padding: 10px 16px; gap: 4px 12px; }
  .nc-trail { grid-column: 1 / -1; order: 3; padding: 0; }
}
</style>
