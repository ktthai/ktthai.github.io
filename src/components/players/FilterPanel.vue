<template>
  <div class="fp">
    <div class="fp-head">
      <span class="fp-title"><v-icon size="18">mdi-tune-variant</v-icon> Filters</span>
      <button v-if="activeCount" class="fp-reset" @click="$emit('reset')">Reset all</button>
    </div>

    <FacetGroup title="Server" icon="mdi-server" v-model:selected="filters.server" :options="serverOpts" />

    <FacetGroup title="Race" icon="mdi-account-group" v-model:selected="filters.race" :options="raceOpts">
      <template #after>
        <div class="fp-seg">
          <button
            v-for="g in genderOpts"
            :key="g.key"
            :class="{ on: filters.gender.includes(g.key) }"
            @click="toggle('gender', g.key)"
          >
            <v-icon size="14">{{ g.icon }}</v-icon>
            {{ g.label }} <span>{{ g.count.toLocaleString() }}</span>
            <i class="fp-seg-bar" :style="{ width: share(g.count, genderMax) }" />
          </button>
        </div>
      </template>
    </FacetGroup>

    <FacetGroup title="Total Level" icon="mdi-chart-line-variant" v-model:selected="filters.level" :options="levelOpts">
      <template #before>
        <div class="fp-hist" aria-hidden="true">
          <div
            v-for="o in levelOpts"
            :key="o.key"
            class="fp-hist-col"
            :class="{ on: filters.level.includes(o.key), dim: filters.level.length && !filters.level.includes(o.key) }"
            :title="`${o.label}: ${o.count.toLocaleString()}`"
            @click="toggle('level', o.key)"
          >
            <div class="fp-hist-bar" :style="{ height: share(o.count, levelMax, 4) }" />
          </div>
        </div>
      </template>
    </FacetGroup>

    <FacetGroup title="Special Items" icon="mdi-star-four-points" v-model:selected="filters.sets" :options="setOpts">
      <template #before>
        <div class="fp-seg fp-seg-sm">
          <button :class="{ on: filters.setMode === 'any' }" @click="filters.setMode = 'any'">
            Has any <span v-if="filters.sets.length">{{ counts.setMode.any.toLocaleString() }}</span>
            <i v-if="filters.sets.length" class="fp-seg-bar" :style="{ width: share(counts.setMode.any, setModeMax) }" />
          </button>
          <button :class="{ on: filters.setMode === 'all' }" @click="filters.setMode = 'all'">
            Has all <span v-if="filters.sets.length">{{ counts.setMode.all.toLocaleString() }}</span>
            <i v-if="filters.sets.length" class="fp-seg-bar" :style="{ width: share(counts.setMode.all, setModeMax) }" />
          </button>
        </div>
      </template>
    </FacetGroup>

    <FacetGroup title="Guild" icon="mdi-shield-half-full" v-model:selected="filters.guild" :options="guildOpts">
      <template #after>
        <v-autocomplete
          v-model="filters.guildNames"
          :items="guildNameItems"
          placeholder="Specific guilds…"
          multiple
          chips
          closable-chips
          density="compact"
          variant="solo-filled"
          flat
          hide-details
          class="fp-auto"
          prepend-inner-icon="mdi-magnify"
        />
      </template>
    </FacetGroup>

    <FacetGroup title="Marriage" icon="mdi-ring" v-model:selected="filters.marriage" :options="marriageOpts" />

    <FacetGroup title="Last Seen Within" icon="mdi-clock-outline" single v-model:selected="filters.seen" :options="seenOpts">
      <template #before>
        <div class="fp-spark" aria-hidden="true">
          <svg viewBox="0 0 100 32" preserveAspectRatio="none">
            <defs>
              <linearGradient id="fp-spark-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--mb-accent)" stop-opacity="0.28" />
                <stop offset="100%" stop-color="var(--mb-accent)" stop-opacity="0" />
              </linearGradient>
            </defs>
            <rect v-if="seenWindow" :x="100 - seenWindow" y="0" :width="seenWindow" height="32" class="fp-spark-window" />
            <path :d="spark.area" fill="url(#fp-spark-fill)" />
            <path :d="spark.line" class="fp-spark-line" vector-effect="non-scaling-stroke" />
          </svg>
          <div class="fp-spark-axis"><span>30 days ago</span><span>today</span></div>
        </div>
      </template>
    </FacetGroup>
    <FacetGroup title="Newly Added" icon="mdi-new-box" single v-model:selected="filters.added" :options="addedOpts" :start-open="false" />
  </div>
</template>

<script>
import { defineComponent, computed } from 'vue';
import FacetGroup from './FacetGroup.vue';
import {
  SERVERS, RACES, LEVEL_BUCKETS, SEEN_OPTIONS, ADDED_OPTIONS, ACTIVITY_DAYS, MARRIAGE_OPTIONS,
  specialSetsWithIcons, countActive,
} from '../../utils/playerFilters.js';

export default defineComponent({
  name: 'FilterPanel',
  components: { FacetGroup },
  props: {
    filters: { type: Object, required: true },
    counts: { type: Object, required: true },
    guilds: { type: Array, default: () => [] }, // [{ name, count }]
  },
  emits: ['reset'],
  setup(props) {
    const c = (facet, key) => props.counts[facet]?.[key] || 0;
    const toggle = (facet, key) => {
      const arr = props.filters[facet];
      const i = arr.indexOf(key);
      i === -1 ? arr.push(key) : arr.splice(i, 1);
    };

    const serverOpts = computed(() =>
      SERVERS.map((s) => ({ key: s, label: s, count: c('server', s) }))
    );
    const raceOpts = computed(() =>
      RACES.map((r) => ({ key: r, label: r, count: c('race', r) }))
    );
    const genderOpts = computed(() => [
      { key: 'Male', label: 'Male', icon: 'mdi-gender-male', count: c('gender', 'Male') },
      { key: 'Female', label: 'Female', icon: 'mdi-gender-female', count: c('gender', 'Female') },
    ]);
    const levelOpts = computed(() =>
      LEVEL_BUCKETS.map((b) => ({ key: b.key, label: b.label, count: c('level', b.key) }))
    );
    const setOpts = computed(() =>
      specialSetsWithIcons.map((s) => ({ key: s.name, label: s.name, img: s.icon, count: c('sets', s.name) }))
    );
    const guildOpts = computed(() => [
      { key: 'has', label: 'In a guild', count: c('guild', 'has') },
      { key: 'none', label: 'No guild', count: c('guild', 'none') },
    ]);
    const marriageOpts = computed(() =>
      MARRIAGE_OPTIONS.map((o) => ({ key: o.key, label: o.label, icon: o.icon, count: c('marriage', o.key) }))
    );
    const seenOpts = computed(() => SEEN_OPTIONS.map((o) => ({ key: o.key, label: o.label, count: c('seen', o.key) })));
    const addedOpts = computed(() => ADDED_OPTIONS.map((o) => ({ key: o.key, label: o.label, count: c('added', o.key) })));
    const guildNameItems = computed(() =>
      props.guilds.map((g) => ({ title: `${g.name} (${g.count})`, value: g.name }))
    );
    const activeCount = computed(() => countActive(props.filters));

    const share = (n, max, min = 0) => `${Math.max(min, max ? (n / max) * 100 : 0)}%`;
    const levelMax = computed(() => Math.max(1, ...levelOpts.value.map((o) => o.count)));
    const genderMax = computed(() => Math.max(1, ...genderOpts.value.map((o) => o.count)));
    const setModeMax = computed(() => Math.max(1, props.counts.setMode?.any || 0, props.counts.setMode?.all || 0));

    // Sparkline of players last seen per day, oldest on the left
    const spark = computed(() => {
      const days = [...(props.counts.seenDays || new Array(ACTIVITY_DAYS).fill(0))].reverse();
      const max = Math.max(1, ...days);
      const step = 100 / (days.length - 1);
      const pts = days.map((v, i) => [i * step, 30 - (v / max) * 27]);
      const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
      return { line, area: `${line} L100,32 L0,32 Z` };
    });
    // Shade the part of the chart covered by the selected "last seen" window
    const seenWindow = computed(() => {
      const o = SEEN_OPTIONS.find((x) => x.key === props.filters.seen[0]);
      if (!o) return 0;
      return Math.min(100, (o.secs / 86400 / (ACTIVITY_DAYS - 1)) * 100);
    });

    return {
      toggle, serverOpts, raceOpts, genderOpts, levelOpts, setOpts, guildOpts, marriageOpts,
      seenOpts, addedOpts, guildNameItems, activeCount,
      share, levelMax, genderMax, setModeMax, spark, seenWindow,
    };
  },
});
</script>

<style scoped>
.fp { display: flex; flex-direction: column; }
.fp-head { display: flex; align-items: center; justify-content: space-between; padding: 4px 4px 8px; }
.fp-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.95rem; }
.fp-reset {
  font-size: 0.75rem; color: var(--mb-accent); background: none; border: 0; cursor: pointer;
}
.fp-seg {
  display: flex; gap: 4px; padding: 3px; margin: 6px 0 2px;
  background: rgba(148, 163, 184, 0.04); border-radius: 10px;
}
.fp-seg-sm { margin: 0 0 6px; }
.fp-seg button {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
  padding: 5px 6px; border-radius: 7px; border: 0; cursor: pointer;
  font-size: 0.78rem; color: var(--mb-text-2); background: transparent;
  transition: all 0.15s;
}
.fp-seg button { position: relative; overflow: hidden; }
.fp-seg button span { font-size: 0.7rem; opacity: 0.6; font-variant-numeric: tabular-nums; }
.fp-seg-bar {
  position: absolute; left: 0; bottom: 0; height: 2px; border-radius: 2px;
  background: rgba(var(--mb-accent-rgb), 0.35); transition: width 0.3s ease; pointer-events: none;
}

.fp-hist {
  display: flex; align-items: flex-end; gap: 3px; height: 36px; padding: 0 8px; margin: 2px 0 8px;
}
.fp-hist-col { flex: 1; height: 100%; display: flex; align-items: flex-end; cursor: pointer; }
.fp-hist-bar {
  width: 100%; border-radius: 3px 3px 1px 1px;
  background: rgba(var(--mb-accent-rgb), 0.28); transition: height 0.3s ease, background 0.15s, opacity 0.15s;
}
.fp-hist-col:hover .fp-hist-bar { background: rgba(var(--mb-accent-rgb), 0.45); }
.fp-hist-col.on .fp-hist-bar { background: rgba(var(--mb-accent-rgb), 0.7); }
.fp-hist-col.dim .fp-hist-bar { opacity: 0.4; }

.fp-spark { padding: 0 8px; margin: 2px 0 8px; }
.fp-spark svg { display: block; width: 100%; height: 36px; overflow: visible; }
.fp-spark-line { fill: none; stroke: rgba(var(--mb-accent-rgb), 0.75); stroke-width: 1.25; stroke-linejoin: round; }
.fp-spark-window { fill: rgba(var(--mb-accent-rgb), 0.13); transition: x 0.3s ease, width 0.3s ease; }
.fp-spark-axis {
  display: flex; justify-content: space-between; margin-top: 4px;
  font-size: 0.65rem; color: var(--mb-text-3);
}
.fp-seg button:hover { color: var(--mb-text); }
.fp-seg button.on { background: rgba(var(--mb-accent-rgb), 0.22); color: var(--mb-text); }
.fp-auto { margin-top: 8px; }
.fp-auto :deep(.v-field) { border-radius: 10px; font-size: 0.85rem; }
</style>
