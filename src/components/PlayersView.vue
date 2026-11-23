<template>
  <div class="pc">
    <!-- Sticky command bar -->
    <header class="pc-bar">
      <div class="pc-bar-row">
        <div class="pc-heading">
          <h1>Players</h1>
          <span class="pc-count">
            <strong>{{ results.length.toLocaleString() }}</strong>
            <template v-if="results.length !== players.length"> of {{ players.length.toLocaleString() }}</template>
          </span>
        </div>

        <label class="pc-search" :class="{ focused: searchFocused }">
          <v-icon size="20" class="pc-search-icon">mdi-magnify</v-icon>
          <input
            ref="searchEl"
            v-model="search"
            placeholder="Search names, guilds, items, UIDs…"
            spellcheck="false"
            @focus="searchFocused = true"
            @blur="searchFocused = false"
            @keydown.esc="search = ''"
          />
          <button v-if="search" class="pc-icon-btn" aria-label="Clear search" @click="search = ''">
            <v-icon size="16">mdi-close</v-icon>
          </button>
          <kbd v-else>/</kbd>
        </label>

        <div class="pc-bar-actions">
          <div class="pc-sort">
            <v-menu location="bottom end" offset="6">
              <template #activator="{ props: menu }">
                <button v-bind="menu" class="pc-btn pc-sort-main">
                  <v-icon size="18">mdi-sort</v-icon>
                  <span class="pc-sort-k">Sort</span>{{ currentSortLabel }}
                </button>
              </template>
              <div class="pc-menu">
                <button
                  v-for="o in SORT_OPTIONS"
                  :key="o.key"
                  class="pc-menu-item"
                  :class="{ on: sortBy[0]?.key === o.key }"
                  @click="setSort(o.key)"
                >
                  <v-icon size="16">{{ o.icon }}</v-icon>{{ o.label }}
                  <v-icon v-if="sortBy[0]?.key === o.key" size="16" class="pc-menu-check">mdi-check</v-icon>
                </button>
              </div>
            </v-menu>
            <button
              class="pc-btn pc-btn-icon pc-sort-dir"
              :disabled="!sortBy.length"
              :title="sortBy[0]?.order === 'desc' ? 'Descending' : 'Ascending'"
              @click="flipSort"
            >
              <v-icon size="18">{{ sortBy[0]?.order === 'desc' ? 'mdi-sort-descending' : 'mdi-sort-ascending' }}</v-icon>
            </button>
          </div>
          <button
            class="pc-btn pc-btn-icon"
            :class="{ on: showIds }"
            :title="showIds ? 'Hide player IDs' : 'Show player IDs'"
            :aria-pressed="showIds"
            @click="showIds = !showIds"
          >
            <v-icon size="18">mdi-pound</v-icon>
          </button>
          <button
            class="pc-btn"
            :class="{ on: showPanel && mdAndUp }"
            @click="mdAndUp ? (showPanel = !showPanel) : (mobileFilters = true)"
          >
            <v-icon size="18">mdi-tune-variant</v-icon>
            Filters
            <span v-if="activeCount" class="pc-btn-badge">{{ activeCount }}</span>
          </button>
        </div>
      </div>

      <!-- Search scope toggles -->
      <div v-if="debouncedSearch" class="pc-scope">
        <span class="pc-scope-label">Match in</span>
        <button
          v-for="s in SCOPES"
          :key="s.key"
          class="pc-pill"
          :class="{ on: scope[s.key], empty: !scopeCounts[s.key] }"
          @click="scope[s.key] = !scope[s.key]"
        >
          <v-icon size="13">{{ scope[s.key] ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}</v-icon>
          {{ s.label }}
          <span>{{ scopeCounts[s.key].toLocaleString() }}</span>
          <i class="pc-pill-bar" :style="{ width: scopeShare(s.key) }" />
        </button>
      </div>

      <!-- Active filter chips -->
      <div v-if="activeChips.length" class="pc-chips">
        <button v-for="chip in activeChips" :key="chip.id" class="pc-chip" @click="chip.remove()">
          <span class="pc-chip-k">{{ chip.group }}</span>{{ chip.label }}
          <v-icon size="14">mdi-close</v-icon>
        </button>
        <button class="pc-chip-clear" @click="resetFilters">Clear all</button>
      </div>
      <div class="pc-progress" aria-hidden="true">
        <div class="pc-progress-fill" :style="{ width: resultShare }" />
      </div>
    </header>

    <div class="pc-body" :class="{ 'with-panel': showPanel && mdAndUp }">
      <aside v-if="showPanel && mdAndUp" class="pc-aside">
        <FilterPanel :filters="filters" :counts="counts" :guilds="guildList" @reset="resetFilters" />
      </aside>

      <section class="pc-main">
        <div v-if="!results.length" class="pc-empty">
          <v-icon size="40">mdi-account-search-outline</v-icon>
          <div class="pc-empty-title">No players match</div>
          <div class="pc-empty-sub">Try removing a filter or widening your search.</div>
          <button class="pc-btn" @click="resetAll">Reset everything</button>
        </div>

        <!-- "Server" mode: we sort and page ourselves and hand Vuetify only the
             visible rows, instead of it re-processing all ~26k players per change -->
        <v-data-table-server
          v-else
          v-model:expanded="expanded"
          v-model:sort-by="sortBy"
          v-model:page="page"
          v-model:items-per-page="perPage"
          :items-length="results.length"
          :row-props="rowProps"
          class="pc-table dense"
          :headers="headers"
          :items="pageItems"
          item-value="id"
          density="compact"
          :items-per-page-options="[25, 50, 100, 200]"
          hover
          @click:row="onRowClick"
        >
          <template #item.name="{ item }">
            <div class="pc-player">
              <div class="pc-player-text">
                <div class="pc-name">
                  <span
                    class="pc-name-text"
                    @mouseenter="showIds ? showTip($event, item.name) : showTip($event, item.name, `#${item._num}`, true)"
                    @mouseleave="hideTip"
                  ><template v-for="(part, i) in hl(item.name, 'name')" :key="i"><mark v-if="part.m" class="pc-hl">{{ part.t }}</mark><template v-else>{{ part.t }}</template></template></span>
                  <span v-if="newTag(item)" class="pc-new" :class="newTag(item).cls">{{ newTag(item).text }}</span>
                </div>
                <div v-if="showIds" class="pc-id">#<template v-for="(part, i) in hl(String(item._num), 'id', true)" :key="i"><mark v-if="part.m" class="pc-hl">{{ part.t }}</mark><template v-else>{{ part.t }}</template></template></div>
              </div>
            </div>
          </template>

          <template #item.guild="{ item }">
            <span v-if="item.guild" class="pc-guild" :title="item.guild"><template v-for="(part, i) in hl(item.guild, 'guild')" :key="i"><mark v-if="part.m" class="pc-hl">{{ part.t }}</mark><template v-else>{{ part.t }}</template></template></span>
            <span v-else class="pc-muted">—</span>
          </template>

          <template #item.spouse="{ item }">
            <span v-if="item.spouse" class="pc-guild" :title="item.spouse">{{ item.spouse }}</span>
          </template>

          <template #item._server="{ item }">
            <span class="pc-tag">{{ item._server }}</span>
          </template>

          <template #item.race="{ item }">
            <span class="pc-race">
              {{ item._race }}
              <i class="mdi pc-muted pc-mdi" :class="item._gender === 'Female' ? 'mdi-gender-female' : 'mdi-gender-male'" />
            </span>
          </template>

          <template #item.totalLevel="{ item }">
            <span class="pc-level">{{ (item.totalLevel || 0).toLocaleString() }}</span>
          </template>

          <template #item.specialItems="{ item }">
            <div class="pc-badges">
              <img
                v-for="b in item._badges"
                :key="b.itemId"
                :src="`/items/${b.itemId}.png`"
                :alt="b.name"
                class="pc-badge"
                loading="lazy"
                @mouseenter="showTip($event, b.name, b.set)"
                @mouseleave="hideTip"
              />
            </div>
          </template>

          <template #item.lastSeen="{ item }">
            <span
              class="pc-seen"
              @mouseenter="showTip($event, new Date(item.lastSeen * 1000).toLocaleString())"
              @mouseleave="hideTip"
            >{{ relativeTime(item.lastSeen) }}</span>
          </template>

          <template #item.data-table-expand="{ internalItem, isExpanded, toggleExpand }">
            <button class="pc-icon-btn pc-expand" :class="{ open: isExpanded(internalItem) }" @click.stop="toggleExpand(internalItem)">
              <i class="mdi mdi-chevron-down pc-mdi pc-mdi-lg" />
            </button>
          </template>

          <template #expanded-row="{ columns, item }">
            <tr class="pc-expanded">
              <td :colspan="columns.length">
                <SpouseCard :previous="item.previousSpouses" />
                <PlayerEquipment
                  :equipment="item.equipment"
                  :item-names="itemNames"
                  :item-history="itemHistory"
                  :player-by-id="playerById"
                />
              </td>
            </tr>
          </template>
        </v-data-table-server>
      </section>
    </div>

    <!-- One shared tooltip for the table (cheaper than a tooltip component per cell) -->
    <div v-if="tip.show" class="pc-ftip" :style="{ left: `${tip.x}px`, top: `${tip.y}px` }">
      <div class="pc-ftip-title">{{ tip.title }}</div>
      <div v-if="tip.sub" class="pc-ftip-sub" :class="{ mono: tip.mono }">{{ tip.sub }}</div>
    </div>

    <v-dialog v-model="mobileFilters" fullscreen transition="dialog-bottom-transition">
      <div class="pc-mobile-sheet">
        <div class="pc-mobile-head">
          <button class="pc-icon-btn" @click="mobileFilters = false"><v-icon>mdi-close</v-icon></button>
        </div>
        <FilterPanel :filters="filters" :counts="counts" :guilds="guildList" @reset="resetFilters" />
        <button class="pc-btn pc-btn-primary pc-mobile-apply" @click="mobileFilters = false">
          Show {{ results.length.toLocaleString() }} players
        </button>
      </div>
    </v-dialog>
  </div>
</template>

<script>
import { defineComponent, ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useDisplay } from 'vuetify';
import PlayerEquipment from './PlayerEquipment.vue';
import SpouseCard from './SpouseCard.vue';
import FilterPanel from './players/FilterPanel.vue';
import { showIds } from '../utils/preferences.js';
import {
  enrichPlayers, evaluate, defaultFilters, countActive, relativeTime,
  SCOPES, LEVEL_BUCKETS, SEEN_OPTIONS, ADDED_OPTIONS,
} from '../utils/playerFilters.js';

const SORT_OPTIONS = [
  { key: 'totalLevel', label: 'Total Level', icon: 'mdi-chart-line-variant', order: 'desc' },
  { key: '_num', label: 'ID', icon: 'mdi-pound', order: 'asc' },
  { key: 'name', label: 'Name', icon: 'mdi-sort-alphabetical-ascending', order: 'asc' },
  { key: 'guild', label: 'Guild', icon: 'mdi-shield-half-full', order: 'asc' },
  { key: 'lastSeen', label: 'Last Seen', icon: 'mdi-clock-outline', order: 'desc' },
  { key: '_server', label: 'Server', icon: 'mdi-server', order: 'asc' },
];

const FACET_LABELS = {
  server: 'Server', race: 'Race', gender: 'Gender', level: 'Level', sets: 'Item',
  guild: 'Guild', guildNames: 'Guild', seen: 'Seen', added: 'Added',
};
const OPTION_LABELS = {
  level: Object.fromEntries(LEVEL_BUCKETS.map((b) => [b.key, b.label])),
  seen: Object.fromEntries(SEEN_OPTIONS.map((o) => [o.key, `< ${o.label}`])),
  added: Object.fromEntries(ADDED_OPTIONS.map((o) => [o.key, o.label])),
  guild: { has: 'In a guild', none: 'No guild' },
};

export default defineComponent({
  name: 'PlayersView',
  components: { PlayerEquipment, SpouseCard, FilterPanel },
  props: {
    players: { type: Array, default: () => [] },
    itemNames: { type: Object, default: () => ({}) },
    itemHistory: { type: Object, default: () => ({}) },
    preset: { type: Object, default: null }, // { filters, search?, scope?, at } from another page
  },
  setup(props) {
    const { mdAndUp } = useDisplay();
    const search = ref('');
    const debouncedSearch = ref('');
    const searchFocused = ref(false);
    const searchEl = ref(null);
    const showPanel = ref(true);
    const mobileFilters = ref(false);
    const expanded = ref([]);
    const filters = reactive(defaultFilters());
    const sortBy = ref([{ key: 'totalLevel', order: 'desc' }]);
    const currentSortLabel = computed(() =>
      SORT_OPTIONS.find((o) => o.key === sortBy.value[0]?.key)?.label || 'Default'
    );
    const setSort = (key) => {
      const o = SORT_OPTIONS.find((x) => x.key === key);
      sortBy.value = [{ key, order: o.order }];
    };
    const flipSort = () => {
      const s = sortBy.value[0];
      if (s) sortBy.value = [{ key: s.key, order: s.order === 'desc' ? 'asc' : 'desc' }];
    };
    const scope = reactive({ name: true, guild: true, item: true, race: true, id: true });

    let t;
    watch(search, (v) => {
      clearTimeout(t);
      t = setTimeout(() => (debouncedSearch.value = v), 200);
    });

    // "/" focuses search, like GitHub / Linear
    const onKey = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        searchEl.value?.focus();
      }
    };
    onMounted(() => window.addEventListener('keydown', onKey));
    onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

    const enriched = computed(() => enrichPlayers(props.players, props.itemNames));

    const evaluated = computed(() => evaluate(enriched.value, filters, debouncedSearch.value, scope));
    const results = computed(() => evaluated.value.results);
    const counts = computed(() => evaluated.value.counts);
    const scopeCounts = computed(() => evaluated.value.scopeCounts);
    const activeCount = computed(() => countActive(filters));

    // ---- shared tooltip ----
    const tip = reactive({ show: false, x: 0, y: 0, title: '', sub: '', mono: false });
    const showTip = (e, title, sub = '', mono = false) => {
      const r = e.currentTarget.getBoundingClientRect();
      Object.assign(tip, { show: true, x: r.left + r.width / 2, y: r.top, title, sub, mono });
    };
    const hideTip = () => (tip.show = false);
    onMounted(() => window.addEventListener('scroll', hideTip, { passive: true }));
    onBeforeUnmount(() => window.removeEventListener('scroll', hideTip));

    // ---- sorting & paging (done here so the table only renders one page) ----
    const page = ref(1);
    const perPage = ref(50);
    // Text columns sort on the precomputed lowercase fields (much faster than
    // locale-aware comparison across ~26k rows)
    const SORT_FIELD = { name: '_nameL', guild: '_guildL', spouse: '_spouseL', race: '_raceL' };
    const sorted = computed(() => {
      const s = sortBy.value[0];
      if (!s) return results.value;
      const dir = s.order === 'desc' ? -1 : 1;
      const f = SORT_FIELD[s.key] || s.key;
      const cmp = s.key === 'guild' || s.key === 'spouse'
        ? (a, b) => {
            const x = a[f], y = b[f];
            if (!x || !y) return x ? -1 : y ? 1 : 0; // players without a guild / spouse stay last
            return (x < y ? -1 : x > y ? 1 : 0) * dir;
          }
        : (a, b) => {
            const x = a[f], y = b[f];
            if (typeof x === 'string') return (x < y ? -1 : x > y ? 1 : 0) * dir;
            return ((x || 0) - (y || 0)) * dir;
          };
      return [...results.value].sort(cmp);
    });
    const pageItems = computed(() =>
      perPage.value === -1 ? sorted.value : sorted.value.slice((page.value - 1) * perPage.value, page.value * perPage.value)
    );
    watch([results, sortBy], () => (page.value = 1));

    const guildList = computed(() => {
      const m = new Map();
      for (const p of enriched.value) if (p.guild) m.set(p.guild, (m.get(p.guild) || 0) + 1);
      return [...m].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    });

    const activeChips = computed(() => {
      const chips = [];
      for (const facet of Object.keys(FACET_LABELS)) {
        for (const val of filters[facet]) {
          chips.push({
            id: `${facet}:${val}`,
            group: FACET_LABELS[facet],
            label: OPTION_LABELS[facet]?.[val] || val,
            remove: () => filters[facet].splice(filters[facet].indexOf(val), 1),
          });
        }
      }
      if (filters.sets.length > 1 && filters.setMode === 'all') {
        chips.push({ id: 'setMode', group: 'Items', label: 'match all', remove: () => (filters.setMode = 'any') });
      }
      return chips;
    });

    const resetFilters = () => Object.assign(filters, defaultFilters());
    const resetAll = () => {
      resetFilters();
      search.value = '';
      Object.keys(scope).forEach((k) => (scope[k] = true));
    };

    const baseHeaders = [
      { title: 'Player', key: 'name' },
      { title: 'Guild', key: 'guild' },
      { title: 'Spouse', key: 'spouse' },
      { title: 'Server', key: '_server' },
      { title: 'Race', key: 'race' },
      { title: 'Level', key: 'totalLevel' },
      { title: 'Items', key: 'specialItems', sortable: false },
      { title: 'Last Seen', key: 'lastSeen' },
      { title: '', key: 'data-table-expand', width: 36 },
    ];
    // Faintly tint whichever column is sorted (ID lives in the Player column)
    // Apply a preset handed over from another page (e.g. clicking "Mari" on Stats)
    watch(
      () => props.preset?.at,
      () => {
        if (!props.preset) return;
        resetFilters();
        Object.keys(scope).forEach((k) => (scope[k] = !props.preset.scope || k === props.preset.scope));
        search.value = props.preset.search || '';
        debouncedSearch.value = search.value;
        Object.assign(filters, props.preset.filters || {});
      },
      { immediate: true }
    );

    const headers = computed(() => {
      const k = sortBy.value[0]?.key === '_num' ? 'name' : sortBy.value[0]?.key;
      return baseHeaders.map((h) =>
        h.key === k ? { ...h, cellProps: { class: 'pc-sorted' }, headerProps: { class: 'pc-sorted' } } : h
      );
    });

    const rowProps = ({ item }) => (expanded.value.includes(item.id) ? { class: 'pc-row-open' } : {});

    const resultShare = computed(() =>
      `${props.players.length ? (results.value.length / props.players.length) * 100 : 0}%`
    );
    const scopeShare = (k) => {
      const max = Math.max(1, ...Object.values(scopeCounts.value));
      return `${(scopeCounts.value[k] / max) * 100}%`;
    };

    // Split text into [{ t, m }] parts so search matches can be underlined
    const hl = (text, scopeKey, prefixOnly = false) => {
      const q = debouncedSearch.value.trim().toLowerCase();
      if (!q || !text || !scope[scopeKey]) return [{ t: text, m: false }];
      const i = text.toLowerCase().indexOf(q);
      if (i === -1 || (prefixOnly && i !== 0)) return [{ t: text, m: false }];
      return [
        { t: text.slice(0, i), m: false },
        { t: text.slice(i, i + q.length), m: true },
        { t: text.slice(i + q.length), m: false },
      ].filter((p) => p.t);
    };

    const onRowClick = (_e, { item }) => {
      const i = expanded.value.indexOf(item.id);
      i === -1 ? expanded.value.push(item.id) : expanded.value.splice(i, 1);
    };

    const newTag = (p) => {
      if (!p.firstSeen) return null;
      const d = Date.now() / 1000 - p.firstSeen;
      if (d < 86400) return { text: 'New today', cls: 'today' };
      if (d < 604800) return { text: 'New', cls: 'week' };
      return null;
    };

    const playerById = computed(() => {
      const map = {};
      for (const p of props.players) map[p.id] = p.name;
      return map;
    });

    return {
      showIds, search, debouncedSearch, searchFocused, searchEl, showPanel, mobileFilters, expanded,
      filters, scope, results, counts, scopeCounts, activeCount, activeChips, guildList,
      resetFilters, resetAll, headers, rowProps, resultShare, scopeShare, hl, onRowClick, newTag, page, perPage, pageItems, tip, showTip, hideTip,
      relativeTime, playerById, mdAndUp, SCOPES, SORT_OPTIONS, sortBy, currentSortLabel, setSort, flipSort,
    };
  },
});
</script>

<style scoped>
.pc {
  --pc-surface: var(--mb-surface);
  --pc-border: var(--mb-border);
  --pc-muted: var(--mb-text-3);
  --pc-radius: 14px;
  color: var(--mb-text);
}

/* ---------- command bar ---------- */
.pc-bar {
  position: sticky; top: 0; z-index: 20;
  padding: 14px 16px 12px; margin-bottom: 16px;
  border: 1px solid var(--pc-border); border-radius: var(--pc-radius);
  background: rgba(21, 25, 34, 0.82);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
}
.pc-bar-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.pc-heading { display: flex; align-items: baseline; gap: 10px; min-width: 150px; }
.pc-heading h1 { font-size: 1.35rem; font-weight: 700; letter-spacing: -0.02em; margin: 0; }
.pc-count { font-size: 0.85rem; color: var(--pc-muted); font-variant-numeric: tabular-nums; }
.pc-count strong { color: var(--mb-text); font-weight: 600; }

.pc-search {
  flex: 1; min-width: 240px; display: flex; align-items: center; gap: 10px;
  height: 42px; padding: 0 12px; border-radius: 11px; cursor: text;
  background: rgba(148, 163, 184, 0.05); border: 1px solid var(--pc-border);
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
.pc-search.focused {
  background: rgba(148, 163, 184, 0.07);
  border-color: rgba(var(--mb-accent-rgb), 0.7);
  box-shadow: 0 0 0 4px rgba(var(--mb-accent-rgb), 0.15);
}
.pc-search-icon { color: var(--pc-muted); }
.pc-search input { flex: 1; min-width: 0; background: none; border: 0; outline: 0; color: var(--mb-text); font-size: 0.95rem; }
.pc-search input::placeholder { color: var(--mb-text-3); }
kbd {
  font-family: inherit; font-size: 0.72rem; color: var(--pc-muted);
  padding: 1px 7px; border-radius: 5px; border: 1px solid var(--pc-border); background: rgba(148, 163, 184, 0.04);
}

.pc-bar-actions { display: flex; gap: 8px; }
.pc-btn {
  display: inline-flex; align-items: center; gap: 7px; height: 38px; padding: 0 14px;
  border-radius: 10px; border: 1px solid var(--pc-border); background: var(--pc-surface);
  color: var(--mb-text); font-size: 0.85rem; font-weight: 500; cursor: pointer;
  transition: all 0.15s;
}
.pc-btn:hover { background: rgba(148, 163, 184, 0.07); color: var(--mb-text); }
.pc-btn.on { border-color: rgba(var(--mb-accent-rgb), 0.5); background: rgba(var(--mb-accent-rgb), 0.12); }
.pc-btn-icon { padding: 0; width: 38px; justify-content: center; }
.pc-btn-primary { background: var(--mb-accent); border-color: transparent; color: var(--mb-on-accent); font-weight: 600; }
.pc-btn-badge {
  min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; display: grid; place-items: center;
  background: var(--mb-accent); color: var(--mb-on-accent); font-size: 0.68rem; font-weight: 700;
}
.pc-btn:disabled { opacity: 0.4; cursor: default; }
.pc-sort { display: flex; }
.pc-sort-main { border-top-right-radius: 0; border-bottom-right-radius: 0; }
.pc-sort-dir { border-top-left-radius: 0; border-bottom-left-radius: 0; border-left: 0; }
.pc-sort-k { color: var(--pc-muted); }
.pc-menu {
  min-width: 200px; padding: 6px; border-radius: 12px;
  background: var(--mb-surface-2); border: 1px solid var(--pc-border);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
}
.pc-menu-item {
  width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 10px;
  border: 0; border-radius: 8px; background: none; cursor: pointer;
  font-size: 0.85rem; color: var(--mb-text); text-align: left;
}
.pc-menu-item:hover { background: rgba(148, 163, 184, 0.06); }
.pc-menu-item.on { color: var(--mb-text); }
.pc-menu-check { margin-left: auto; color: var(--mb-accent); }
.pc-icon-btn {
  display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px;
  border: 0; background: none; color: var(--pc-muted); cursor: pointer;
}
.pc-icon-btn:hover { background: rgba(148, 163, 184, 0.08); color: var(--mb-text); }

.pc-scope, .pc-chips { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
.pc-scope-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--pc-muted); margin-right: 4px; }
.pc-pill {
  display: inline-flex; align-items: center; gap: 5px; height: 28px; padding: 0 10px;
  border-radius: 999px; border: 1px solid var(--pc-border); background: transparent;
  color: var(--pc-muted); font-size: 0.78rem; cursor: pointer; transition: all 0.15s;
}
.pc-pill span { font-variant-numeric: tabular-nums; opacity: 0.7; }
.pc-pill.on { color: var(--mb-text); border-color: rgba(var(--mb-accent-rgb), 0.5); background: rgba(var(--mb-accent-rgb), 0.12); }
.pc-pill.on .v-icon { color: var(--mb-accent); }
.pc-pill.empty { opacity: 0.45; }

.pc-chip {
  display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 6px 0 10px;
  border-radius: 8px; border: 0; cursor: pointer; font-size: 0.78rem; color: var(--mb-text);
  background: rgba(var(--mb-accent-rgb), 0.16); transition: background 0.15s;
}
.pc-chip:hover { background: rgba(var(--mb-accent-rgb), 0.28); }
.pc-chip-k { color: var(--mb-text-2); margin-right: -2px; }
.pc-chip-k::after { content: ':'; }
.pc-chip-clear { font-size: 0.78rem; color: var(--pc-muted); background: none; border: 0; cursor: pointer; margin-left: 4px; }
.pc-chip-clear:hover { color: var(--mb-text); text-decoration: underline; }

/* ---------- layout ---------- */
.pc-body { display: grid; grid-template-columns: 1fr; gap: 16px; align-items: start; }
.pc-body.with-panel { grid-template-columns: 272px minmax(0, 1fr); }
.pc-aside {
  position: sticky; top: 96px; max-height: calc(100vh - 112px); overflow-y: auto;
  padding: 12px 10px; border-radius: var(--pc-radius);
  border: 1px solid var(--pc-border); background: var(--pc-surface);
  scrollbar-width: thin;
}
.pc-main { min-width: 0; }

.pc-empty {
  display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 72px 16px;
  border: 1px dashed var(--pc-border); border-radius: var(--pc-radius); color: var(--pc-muted);
}
.pc-empty-title { color: var(--mb-text); font-weight: 600; font-size: 1.05rem; }
.pc-empty-sub { font-size: 0.85rem; margin-bottom: 8px; }

/* ---------- table ---------- */
.pc-table {
  background: var(--pc-surface) !important; border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius); overflow: hidden;
}
.pc-table :deep(thead th) {
  font-size: 0.7rem !important; font-weight: 600 !important; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--pc-muted) !important;
  background: rgba(148, 163, 184, 0.02) !important; border-bottom: 1px solid var(--pc-border) !important;
}
.pc-table :deep(tbody tr) { cursor: pointer; transition: background 0.12s; }
.pc-table :deep(th), .pc-table :deep(td) { padding: 0 12px !important; }
.pc-table :deep(th:first-child), .pc-table :deep(td:first-child) { padding-left: 18px !important; }
.pc-table :deep(th:last-child), .pc-table :deep(td:last-child) { padding: 0 8px 0 0 !important; }
.pc-table :deep(thead th) { white-space: nowrap; }
.pc-table :deep(th:not(.v-data-table__th--sorted) .v-data-table-header__sort-icon) { display: none; }
.pc-table :deep(tbody tr td) { border-bottom: 1px solid rgba(148, 163, 184, 0.04) !important; }
.pc-table :deep(tbody tr:hover > td) { background: rgba(148, 163, 184, 0.025); }
.pc-table :deep(.v-data-table-footer) { border-top: 1px solid var(--pc-border); font-size: 0.8rem; color: var(--pc-muted); }

.pc-player { display: flex; align-items: center; gap: 12px; padding: 10px 0; }
.dense .pc-player { padding: 3px 0; }
.dense .pc-player-text { display: flex; align-items: baseline; gap: 10px; }
.pc-player-text { min-width: 0; }
.pc-name { display: flex; align-items: center; gap: 8px; min-width: 0; font-weight: 600; font-size: 0.9rem; }
.pc-name-text { max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pc-guild { display: block; max-width: 108px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.85rem; color: var(--mb-text); }
.pc-muted { color: var(--mb-text-3); }

.pc-new {
  font-size: 0.62rem; font-weight: 700; padding: 1px 6px; border-radius: 5px;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.pc-new.today { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
.pc-new.week { background: rgba(96, 165, 250, 0.15); color: #60a5fa; }

.pc-tag {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 0.82rem; color: var(--mb-text-2);
}
.pc-race { display: inline-flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 400; color: var(--mb-text-2); }

.pc-level { font-variant-numeric: tabular-nums; font-size: 0.85rem; }

.pc-badges { display: flex; flex-wrap: wrap; gap: 3px; min-width: 105px; max-width: 108px; padding: 3px 0; }
.pc-badge {
  box-sizing: border-box; width: 24px; height: 24px; object-fit: contain; padding: 2px; border-radius: 6px;
  background: rgba(148, 163, 184, 0.05); transition: transform 0.15s;
}
.pc-badge:hover { transform: translateY(-2px) scale(1.1); }

.pc-seen { white-space: nowrap; font-size: 0.82rem; color: var(--mb-text-2); }

.pc-id { margin-top: 2px; white-space: nowrap; font-family: var(--mb-mono); font-size: 0.74rem; color: var(--mb-text-2); font-variant-numeric: tabular-nums; }

.pc-expand .mdi { transition: transform 0.2s; }
.pc-expand.open .mdi { transform: rotate(180deg); }
.pc-table :deep(.pc-expanded > td) { background: rgba(0, 0, 0, 0.18); padding: 12px 16px !important; cursor: default; }

/* ---------- subtle data decorations ---------- */
.pc-bar { overflow: hidden; }
.pc-progress { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: transparent; }
.pc-progress-fill {
  height: 100%; background: linear-gradient(90deg, rgba(var(--mb-accent-rgb), 0.15), rgba(var(--mb-accent-rgb), 0.6));
  transition: width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.pc-pill { position: relative; overflow: hidden; }
.pc-pill-bar {
  position: absolute; left: 0; bottom: 0; height: 2px;
  background: rgba(var(--mb-accent-rgb), 0.4); transition: width 0.3s ease; pointer-events: none;
}
.pc-table :deep(td.pc-sorted) { background: rgba(var(--mb-accent-rgb), 0.035); }
.pc-table :deep(th.pc-sorted) { color: var(--mb-text-2) !important; }
.pc-mdi { font-size: 14px; line-height: 1; }
.pc-mdi-lg { font-size: 18px; }
.pc-ftip {
  position: fixed; z-index: 2000; pointer-events: none; white-space: nowrap;
  transform: translate(-50%, calc(-100% - 8px));
  background: var(--mb-surface-2); color: var(--mb-text); border: 1px solid var(--mb-border);
  border-radius: 8px; padding: 6px 10px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}
.pc-ftip-title { font-size: 0.78rem; font-weight: 600; }
.pc-ftip-sub { font-size: 0.72rem; color: var(--mb-text-3); }
.pc-ftip-sub.mono { font-family: var(--mb-mono); }
.pc-hl {
  background: rgba(var(--mb-accent-rgb), 0.14); color: inherit;
  border-radius: 2px; box-shadow: inset 0 -1.5px 0 rgba(var(--mb-accent-rgb), 0.7);
}
.pc-table :deep(tr.pc-row-open > td) { background: rgba(var(--mb-accent-rgb), 0.05); }
.pc-table :deep(tr.pc-row-open > td:first-child),
.pc-table :deep(.pc-expanded > td) { box-shadow: inset 2px 0 0 rgba(var(--mb-accent-rgb), 0.65); }

/* ---------- mobile ---------- */
.pc-mobile-sheet { min-height: 100%; padding: 12px 16px 88px; background: var(--mb-bg); }
.pc-mobile-head { display: flex; justify-content: flex-end; }
.pc-mobile-apply { position: fixed; left: 16px; right: 16px; bottom: 16px; height: 48px; justify-content: center; }
@media (max-width: 600px) {
  .pc-heading { width: 100%; }
  .pc-search { order: 3; flex-basis: 100%; }
}
</style>
