<template>
  <div class="st" :class="{ ready }">
    <header class="st-head">
      <h1>Stats</h1>
      <span class="st-sub">Based on {{ totalPlayers.toLocaleString() }} tracked players · click anything to explore those players</span>
    </header>

    <!-- Headline numbers -->
    <section class="st-kpis">
      <div class="st-kpi">
        <div class="st-kpi-label">Players tracked</div>
        <div class="st-kpi-value">{{ kTotal.toLocaleString() }}</div>
        <div class="st-kpi-foot">across {{ SERVERS.length }} servers</div>
      </div>
      <button class="st-kpi link" @click="open({ guild: ['has'] })">
        <div class="st-kpi-label">In a guild</div>
        <div class="st-kpi-value">{{ kGuildPct.toFixed(1) }}%</div>
        <div class="st-kpi-foot">{{ guildedCount.toLocaleString() }} players</div>
        <i class="st-kpi-bar" :style="{ width: ready ? `${guildPct}%` : 0 }" />
      </button>
      <button class="st-kpi link" @click="open({ seen: ['7d'] })">
        <div class="st-kpi-label">Seen this week</div>
        <div class="st-kpi-value">{{ kSeenWeek.toLocaleString() }}</div>
        <div class="st-kpi-foot">{{ pctText(seenWeek, totalPlayers) }} of all players</div>
        <svg class="st-kpi-spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
          <path :d="weekSpark" />
        </svg>
      </button>
      <button class="st-kpi link" @click="open({ added: ['week'] })">
        <div class="st-kpi-label">New this week</div>
        <div class="st-kpi-value">{{ kNewWeek.toLocaleString() }}</div>
        <div class="st-kpi-foot">{{ newToday.toLocaleString() }} added today</div>
      </button>
    </section>

    <!-- Activity -->
    <section class="st-card">
      <div class="st-card-head">
        <h2>Activity</h2>
        <span class="st-card-sub">Players last seen per day</span>
        <span class="st-spacer" />
        <div class="st-seg">
          <button v-for="r in RANGES" :key="r" :class="{ on: range === r }" @click="range = r">{{ r }}d</button>
        </div>
      </div>
      <div class="st-chart" @mousemove="onActivityMove" @mouseleave="hoverDay = null">
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" class="st-chart-svg">
          <defs>
            <linearGradient id="st-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--mb-accent)" stop-opacity="0.26" />
              <stop offset="100%" stop-color="var(--mb-accent)" stop-opacity="0" />
            </linearGradient>
            <clipPath :id="`st-reveal-${range}`">
              <rect x="0" y="-2" width="0" height="44">
                <animate attributeName="width" from="0" to="100" :dur="reducedMotion ? '0.01s' : '0.9s'" fill="freeze" calcMode="spline" keySplines="0.2 0.8 0.2 1" keyTimes="0;1" />
              </rect>
            </clipPath>
          </defs>
          <line v-for="g in [10, 20, 30]" :key="g" x1="0" x2="100" :y1="g" :y2="g" class="st-gridline" vector-effect="non-scaling-stroke" />
          <g :key="range" :clip-path="`url(#st-reveal-${range})`">
            <path :d="activity.area" fill="url(#st-area)" />
            <path :d="activity.line" class="st-line" vector-effect="non-scaling-stroke" />
          </g>
          <line
            v-if="hoverDay !== null"
            :x1="activity.pts[hoverDay][0]" :x2="activity.pts[hoverDay][0]" y1="0" y2="40"
            class="st-cross" vector-effect="non-scaling-stroke"
          />
        </svg>
        <div
          v-if="hoverDay !== null"
          class="st-marker"
          :style="{ left: `${activity.pts[hoverDay][0]}%`, top: `${(activity.pts[hoverDay][1] / 40) * 100}%` }"
        />
        <div
          v-if="hoverDay !== null"
          class="st-tip"
          :style="{ left: `${activity.pts[hoverDay][0]}%`, transform: tipShift(activity.pts[hoverDay][0]) }"
        >
          <div class="st-tip-value">{{ activity.days[hoverDay].count.toLocaleString() }} players</div>
          <div class="st-tip-label">{{ activity.days[hoverDay].label }}</div>
        </div>
        <div class="st-peak" :style="{ left: `${activity.pts[activity.peak][0]}%`, transform: tipShift(activity.pts[activity.peak][0]) }" v-show="hoverDay === null">
          Peak · {{ activity.days[activity.peak].count.toLocaleString() }}
        </div>
      </div>
      <div class="st-axis"><span>{{ range }} days ago</span><span>today</span></div>
    </section>

    <div class="st-grid">
      <!-- Activity by hour -->
      <section class="st-card span-7">
        <div class="st-card-head">
          <h2>Activity by hour</h2>
          <span class="st-card-sub">Last 90 days</span>
          <v-tooltip location="top" max-width="260">
            <template #activator="{ props: info }">
              <v-icon v-bind="info" size="15" class="st-info" aria-label="About this chart">mdi-information-outline</v-icon>
            </template>
            Based on the day and hour each player was last seen, shown in your time zone.
          </v-tooltip>
        </div>
        <div class="st-punch" @mouseleave="hideTip">
          <div class="st-punch-corner" />
          <div v-for="h in 24" :key="`h${h}`" class="st-punch-hour">{{ (h - 1) % 3 === 0 ? hourLabel(h - 1) : '' }}</div>
          <template v-for="(row, d) in punch.grid" :key="d">
            <div class="st-punch-day">{{ WEEKDAYS[d] }}</div>
            <div
              v-for="(v, h) in row"
              :key="h"
              class="st-punch-cell"
              :style="{ '--a': ready ? 0.06 + 0.82 * (v / punch.max) : 0, transitionDelay: `${(d * 24 + h) * 3}ms` }"
              @mousemove="showTip($event, `${v.toLocaleString()} players`, `${WEEKDAYS_LONG[d]} · ${hourLabel(h)}–${hourLabel((h + 1) % 24)}`)"
            />
          </template>
        </div>
        <div class="st-foot">Busiest: {{ WEEKDAYS_LONG[punch.best.d] }} around {{ hourLabel(punch.best.h) }}</div>
      </section>

      <!-- Gender by race -->
      <section class="st-card span-5">
        <div class="st-card-head">
          <h2>Gender by race</h2>
        </div>
        <div class="st-pyr-legend"><span>♂ Male</span><span>Female ♀</span></div>
        <div class="st-pyr">
          <div v-for="r in pyramid.rows" :key="r.race" class="st-pyr-row">
            <button
              class="st-pyr-side left"
              @click="open({ race: [r.race], gender: ['Male'] })"
              @mousemove="showTip($event, `${r.male.toLocaleString()} male ${r.race}s`, `${pctText(r.male, r.male + r.female)} of ${r.race}s`)"
              @mouseleave="hideTip"
            >
              <span class="st-pyr-val">{{ r.male.toLocaleString() }}</span>
              <i class="st-pyr-bar" :style="{ width: ready ? `${(r.male / pyramid.max) * 100}%` : 0 }" />
            </button>
            <div class="st-pyr-label">{{ r.race }}</div>
            <button
              class="st-pyr-side right"
              @click="open({ race: [r.race], gender: ['Female'] })"
              @mousemove="showTip($event, `${r.female.toLocaleString()} female ${r.race}s`, `${pctText(r.female, r.male + r.female)} of ${r.race}s`)"
              @mouseleave="hideTip"
            >
              <i class="st-pyr-bar" :style="{ width: ready ? `${(r.female / pyramid.max) * 100}%` : 0 }" />
              <span class="st-pyr-val">{{ r.female.toLocaleString() }}</span>
            </button>
          </div>
        </div>
        <div class="st-foot">{{ pctText(pyramid.female, pyramid.male + pyramid.female) }} of all characters are female</div>
      </section>

      <!-- Server x Race -->
      <section class="st-card span-6">
        <div class="st-card-head">
          <h2>Server × Race</h2>
        </div>
        <div class="st-heat" @mouseleave="hideTip">
          <div />
          <button v-for="race in RACES" :key="race" class="st-heat-col" @click="open({ race: [race] })">{{ race }}</button>
          <div class="st-heat-col total">Total</div>
          <template v-for="row in heat.rows" :key="row.server">
            <button class="st-heat-row" @click="open({ server: [row.server] })">{{ row.server }}</button>
            <button
              v-for="c in row.cells"
              :key="c.race"
              class="st-heat-cell"
              :style="{ '--a': ready ? 0.07 + 0.7 * (c.count / heat.max) : 0 }"
              @click="open({ server: [row.server], race: [c.race] })"
              @mousemove="showTip($event, `${c.count.toLocaleString()} ${c.race}s on ${row.server}`, `${pctText(c.count, row.total)} of ${row.server}`)"
            >{{ compact(c.count) }}</button>
            <div class="st-heat-total">
              <span>{{ row.total.toLocaleString() }}</span>
              <i :style="{ width: ready ? `${(row.total / heat.maxRow) * 100}%` : 0 }" />
            </div>
          </template>
        </div>
      </section>

      <!-- Level distribution -->
      <section class="st-card span-6">
        <div class="st-card-head">
          <h2>Total level spread</h2>
          <span class="st-card-sub">Click a bar to view that range</span>
        </div>
        <div class="st-hist" @mouseleave="hoverBin = null; hideTip()">
          <button
            v-for="(b, i) in levelHist.bins"
            :key="i"
            class="st-hist-col"
            :class="{ group: hoverBin !== null && LEVEL_BINS[hoverBin].bucket === b.bucket, hot: hoverBin === i }"
            @click="open({ level: [b.bucket] })"
            @mouseenter="hoverBin = i"
            @mousemove="showTip($event, `${b.count.toLocaleString()} players`, `Level ${b.range} · click for ${bucketLabel(b.bucket)}`)"
          >
            <i class="st-hist-bar" :style="{ height: ready ? `${Math.max(1.5, (b.count / levelHist.max) * 100)}%` : 0, transitionDelay: `${i * 40}ms` }" />
          </button>
        </div>
        <div class="st-hist-axis">
          <span v-for="(b, i) in levelHist.bins" :key="i">{{ i % 2 === 0 ? b.label : '' }}</span>
        </div>
        <div class="st-foot">Median total level: {{ levelHist.median.toLocaleString() }}</div>
      </section>
    </div>

    <!-- Special item sets -->
    <section class="st-card">
      <div class="st-card-head">
        <h2>Special Item Sets</h2>
      </div>
      <div class="st-sets">
        <div v-for="set in specialItemSetStats" :key="set.name" class="st-set">
          <button class="st-set-head" @click="open({ sets: [set.name] })">
            <img :src="set.icon" alt="" class="st-set-icon" />
            <div class="st-set-text">
              <div class="st-set-name">{{ set.name }}</div>
              <div class="st-set-meta">
                {{ set.totalOwners.toLocaleString() }} owner{{ set.totalOwners === 1 ? '' : 's' }}
                · {{ set.variants.length }} variant{{ set.variants.length === 1 ? '' : 's' }}
              </div>
            </div>
            <v-icon size="16" class="st-set-go">mdi-arrow-right</v-icon>
          </button>
          <div class="st-variants">
            <div
              v-for="v in visibleVariants(set)"
              :key="v.itemId"
              class="st-variant"
              :title="`${v.name}: ${v.count.toLocaleString()} owners`"
            >
              <img :src="`/items/${v.itemId}.png`" alt="" class="st-variant-icon" />
              <span class="st-variant-name">{{ v.name }}</span>
              <span class="st-variant-count">{{ v.count.toLocaleString() }}</span>
              <i class="st-variant-bar" :style="{ width: ready && set.maxCount ? `${(v.count / set.maxCount) * 100}%` : 0 }" />
            </div>
            <button v-if="set.variants.length > VARIANT_PREVIEW" class="st-more" @click="toggleSet(set.name)">
              {{ expandedSets.has(set.name) ? 'Show less' : `Show all ${set.variants.length}` }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Shared floating tooltip -->
    <div v-if="tip.show" class="st-ftip" :style="{ left: `${tip.x}px`, top: `${tip.y}px` }">
      <div class="st-tip-value">{{ tip.title }}</div>
      <div class="st-tip-label">{{ tip.sub }}</div>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed, ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import { getServer, getRaceBase } from '../utils/playerStats.js';
import { specialItemSets, specialItemMap } from '../utils/specialItems.js';
import { SERVERS, RACES, LEVEL_BUCKETS } from '../utils/playerFilters.js';
import {
  useCountUp, useReady, prefersReducedMotion, LEVEL_BINS, levelBinIndex,
} from '../utils/statsCharts.js';

const DAY = 86400;
const RANGES = [7, 30, 90];
const VARIANT_PREVIEW = 5;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default defineComponent({
  name: 'StatsView',
  props: {
    players: { type: Array, required: true },
    itemNames: { type: Object, default: () => ({}) },
  },
  emits: ['open-players'],
  setup(props, { emit }) {
    const nowSec = Date.now() / 1000;
    const ready = useReady();
    const reducedMotion = prefersReducedMotion();
    const range = ref(30);
    const hoverDay = ref(null);
    const hoverBin = ref(null);
    const expandedSets = reactive(new Set());

    const open = (filters) => emit('open-players', { filters });
    const pctText = (n, total) => `${total ? ((n / total) * 100).toFixed(1) : 0}%`;
    const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));
    const tipShift = (x) => (x < 12 ? 'translateX(0)' : x > 88 ? 'translateX(-100%)' : 'translateX(-50%)');
    const hourLabel = (h) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'a' : 'p'}`;
    const bucketLabel = (k) => LEVEL_BUCKETS.find((b) => b.key === k)?.label || k;

    // Floating tooltip shared by the grid-style charts
    const tip = reactive({ show: false, x: 0, y: 0, title: '', sub: '' });
    const showTip = (e, title, sub) => Object.assign(tip, { show: true, x: e.clientX, y: e.clientY, title, sub });
    const hideTip = () => (tip.show = false);
    onMounted(() => window.addEventListener('scroll', hideTip, { passive: true }));
    onBeforeUnmount(() => window.removeEventListener('scroll', hideTip));

    const totalPlayers = computed(() => props.players.length);

    // ---- One pass over all players for every chart ----
    const agg = computed(() => {
      const days = new Array(90).fill(0);
      const punch = Array.from({ length: 7 }, () => new Array(24).fill(0));
      const heat = Object.fromEntries(SERVERS.map((s) => [s, Object.fromEntries(RACES.map((r) => [r, 0]))]));
      const gender = Object.fromEntries(RACES.map((r) => [r, { Male: 0, Female: 0 }]));
      const bins = new Array(LEVEL_BINS.length).fill(0);
      const levels = [];
      let guilded = 0, seenWeek = 0, newWeek = 0, newToday = 0;

      for (const p of props.players) {
        const ago = nowSec - p.lastSeen;
        const d = Math.floor(ago / DAY);
        if (d >= 0 && d < 90) {
          days[d]++;
          const dt = new Date(p.lastSeen * 1000);
          punch[(dt.getDay() + 6) % 7][dt.getHours()]++;
        }
        if (ago <= 7 * DAY) seenWeek++;
        if (p.firstSeen) {
          const age = nowSec - p.firstSeen;
          if (age < 7 * DAY) newWeek++;
          if (age < DAY) newToday++;
        }
        const g = p.guild; // a guild named " " is a real guild
        if (g) guilded++;
        const server = getServer(p.id);
        const [race, sex] = (p.race || '').split(' ');
        if (heat[server] && heat[server][race] !== undefined) heat[server][race]++;
        if (gender[race] && gender[race][sex] !== undefined) gender[race][sex]++;
        if (p.totalLevel > 0) {
          bins[levelBinIndex(p.totalLevel)]++;
          levels.push(p.totalLevel);
        }
      }
      levels.sort((a, b) => a - b);
      return {
        days, punch, heat, gender, bins, guilded, seenWeek, newWeek, newToday,
        median: levels.length ? levels[Math.floor(levels.length / 2)] : 0,
      };
    });

    // ---- KPIs ----
    const guildedCount = computed(() => agg.value.guilded);
    const seenWeek = computed(() => agg.value.seenWeek);
    const newToday = computed(() => agg.value.newToday);
    const guildPct = computed(() => (totalPlayers.value ? (guildedCount.value / totalPlayers.value) * 100 : 0));
    const kTotal = useCountUp(totalPlayers);
    const kGuildPct = useCountUp(guildPct, { decimals: 1 });
    const kSeenWeek = useCountUp(seenWeek);
    const kNewWeek = useCountUp(computed(() => agg.value.newWeek));
    const weekSpark = computed(() => {
      const v = agg.value.days.slice(0, 7).reverse();
      const max = Math.max(1, ...v);
      return v.map((n, i) => `${i ? 'L' : 'M'}${(i / 6) * 100},${22 - (n / max) * 18}`).join(' ');
    });

    // ---- Activity ----
    const activity = computed(() => {
      const raw = agg.value.days.slice(0, range.value).reverse(); // oldest first
      const max = Math.max(1, ...raw);
      const step = 100 / (raw.length - 1);
      const pts = raw.map((v, i) => [i * step, 38 - (v / max) * 33]);
      const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
      const days = raw.map((count, i) => {
        const ago = raw.length - 1 - i;
        const date = new Date((nowSec - ago * DAY) * 1000);
        const label = ago === 0 ? 'Today' : ago === 1 ? 'Yesterday'
          : date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        return { count, label };
      });
      const peak = raw.indexOf(max);
      return { pts, line, area: `${line} L100,40 L0,40 Z`, days, peak };
    });
    const onActivityMove = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const n = activity.value.pts.length;
      hoverDay.value = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - rect.left) / rect.width) * (n - 1))));
    };

    // ---- Punchcard ----
    const punch = computed(() => {
      const grid = agg.value.punch;
      let max = 1, best = { d: 0, h: 0 };
      grid.forEach((row, d) => row.forEach((v, h) => {
        if (v > max) { max = v; best = { d, h }; }
      }));
      return { grid, max, best };
    });

    // ---- Gender pyramid ----
    const pyramid = computed(() => {
      const rows = RACES.map((race) => ({ race, male: agg.value.gender[race].Male, female: agg.value.gender[race].Female }));
      return {
        rows,
        max: Math.max(1, ...rows.flatMap((r) => [r.male, r.female])),
        male: rows.reduce((s, r) => s + r.male, 0),
        female: rows.reduce((s, r) => s + r.female, 0),
      };
    });

    // ---- Server x Race heatmap ----
    const heat = computed(() => {
      const rows = SERVERS.map((server) => {
        const cells = RACES.map((race) => ({ race, count: agg.value.heat[server][race] }));
        return { server, cells, total: cells.reduce((s, c) => s + c.count, 0) };
      });
      return {
        rows,
        max: Math.max(1, ...rows.flatMap((r) => r.cells.map((c) => c.count))),
        maxRow: Math.max(1, ...rows.map((r) => r.total)),
      };
    });

    // ---- Level histogram ----
    const levelHist = computed(() => {
      const bins = LEVEL_BINS.map((b, i) => {
        const lo = i === 0 ? 1 : LEVEL_BINS[i - 1].max;
        const range = b.max === Infinity ? `${lo.toLocaleString()}+` : `${lo.toLocaleString()}–${b.max.toLocaleString()}`;
        return { ...b, count: agg.value.bins[i], range };
      });
      return { bins, max: Math.max(1, ...bins.map((b) => b.count)), median: agg.value.median };
    });

    // ---- Special item sets ----
    const specialItemSetStats = computed(() => {
      const bySet = new Map(
        specialItemSets.map((set) => [set.name, { counts: new Map(set.items.map((id) => [id, 0])), owners: new Set() }])
      );
      for (const p of props.players) {
        if (!p.equipment) continue;
        const seenItems = new Set();
        const seenSets = new Set();
        for (const d of Object.values(p.equipment)) {
          const id = typeof d === 'number' ? d : d.itemId;
          const setName = specialItemMap.get(id);
          if (!setName) continue;
          if (!seenItems.has(id)) {
            seenItems.add(id);
            const e = bySet.get(setName);
            e.counts.set(id, e.counts.get(id) + 1);
          }
          seenSets.add(setName);
        }
        for (const s of seenSets) bySet.get(s).owners.add(p.id);
      }
      return specialItemSets
        .map((set) => {
          const e = bySet.get(set.name);
          const variants = set.items
            .map((id) => ({ itemId: id, name: props.itemNames[String(id)], count: e.counts.get(id) }))
            .filter((v) => v.name || v.count > 0)
            .map((v) => ({ ...v, name: v.name || `Unknown Item (${v.itemId})` }))
            .sort((a, b) => b.count - a.count);
          return {
            name: set.name,
            icon: `/items/${set.items[0]}.png`,
            totalOwners: e.owners.size,
            variants,
            maxCount: variants.reduce((m, v) => Math.max(m, v.count), 0),
          };
        })
        .sort((a, b) => b.totalOwners - a.totalOwners);
    });
    const visibleVariants = (set) =>
      expandedSets.has(set.name) ? set.variants : set.variants.slice(0, VARIANT_PREVIEW);
    const toggleSet = (name) => (expandedSets.has(name) ? expandedSets.delete(name) : expandedSets.add(name));

    return {
      SERVERS, RACES, RANGES, VARIANT_PREVIEW, WEEKDAYS, WEEKDAYS_LONG, LEVEL_BINS,
      ready, reducedMotion, range, hoverDay, hoverBin, expandedSets, tip,
      open, pctText, compact, tipShift, hourLabel, bucketLabel, showTip, hideTip,
      totalPlayers, guildedCount, seenWeek, newToday, guildPct,
      kTotal, kGuildPct, kSeenWeek, kNewWeek, weekSpark,
      activity, onActivityMove, punch, pyramid, heat, levelHist,
      specialItemSetStats, visibleVariants, toggleSet,
    };
  },
});
</script>

<style scoped>
.st { display: flex; flex-direction: column; gap: 16px; color: var(--mb-text); }
.st-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; padding: 4px 4px 0; }
.st-head h1 { margin: 0; font-size: 1.35rem; font-weight: 700; letter-spacing: -0.02em; }
.st-sub { font-size: 0.85rem; color: var(--mb-text-3); }

/* ---------- layout & cards ---------- */
.st-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 16px; }
.span-5 { grid-column: span 5; }
.span-6 { grid-column: span 6; }
.span-7 { grid-column: span 7; }
@media (max-width: 1100px) { .span-5, .span-6, .span-7 { grid-column: span 12; } }

.st-card {
  background: var(--mb-surface); border: 1px solid var(--mb-border); border-radius: 14px;
  padding: 16px 18px 18px; min-width: 0;
}
.st-card-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.st-card-head h2 { margin: 0; font-size: 0.95rem; font-weight: 600; }
.st-card-sub { font-size: 0.78rem; color: var(--mb-text-3); }
.st-info { align-self: center; color: var(--mb-text-3); cursor: help; }
.st-info:hover { color: var(--mb-text-2); }
.st-spacer { flex: 1; }
.st-foot { margin-top: 12px; font-size: 0.76rem; color: var(--mb-text-3); }

.st-seg { display: flex; gap: 2px; padding: 3px; border-radius: 9px; background: rgba(148, 163, 184, 0.06); }
.st-seg button {
  height: 26px; padding: 0 10px; border: 0; border-radius: 7px; background: none; cursor: pointer;
  font: inherit; font-size: 0.76rem; color: var(--mb-text-2); transition: all 0.15s;
}
.st-seg button:hover { color: var(--mb-text); }
.st-seg button.on { background: rgba(var(--mb-accent-rgb), 0.2); color: var(--mb-text); }

/* ---------- KPI tiles ---------- */
.st-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
.st-kpi {
  position: relative; overflow: hidden; text-align: left;
  background: var(--mb-surface); border: 1px solid var(--mb-border); border-radius: 14px;
  padding: 14px 16px; color: inherit; font: inherit;
}
.st-kpi.link { cursor: pointer; transition: border-color 0.15s, background 0.15s, transform 0.15s; }
.st-kpi.link:hover { border-color: rgba(var(--mb-accent-rgb), 0.45); background: var(--mb-surface-2); transform: translateY(-1px); }
.st-kpi-label { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--mb-text-3); }
.st-kpi-value { margin-top: 6px; font-size: 1.7rem; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.st-kpi-foot { margin-top: 2px; font-size: 0.78rem; color: var(--mb-text-2); }
.st-kpi-bar {
  position: absolute; left: 0; bottom: 0; height: 2px; width: 0;
  background: linear-gradient(90deg, rgba(var(--mb-accent-rgb), 0.15), rgba(var(--mb-accent-rgb), 0.7));
  transition: width 1s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.st-kpi-spark { position: absolute; right: 14px; top: 16px; width: 72px; height: 24px; overflow: visible; }
.st-kpi-spark path { fill: none; stroke: rgba(var(--mb-accent-rgb), 0.7); stroke-width: 1.5; vector-effect: non-scaling-stroke; stroke-linejoin: round; }

/* ---------- activity ---------- */
.st-chart { position: relative; height: 180px; cursor: crosshair; }
.st-chart-svg { display: block; width: 100%; height: 100%; overflow: visible; }
.st-gridline { stroke: rgba(148, 163, 184, 0.08); stroke-width: 1; }
.st-line { fill: none; stroke: var(--mb-accent); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.st-cross { stroke: rgba(148, 163, 184, 0.35); stroke-width: 1; }
.st-marker {
  position: absolute; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; pointer-events: none;
  background: var(--mb-accent); box-shadow: 0 0 0 3px var(--mb-surface), 0 0 0 6px rgba(var(--mb-accent-rgb), 0.25);
}
.st-tip, .st-ftip {
  pointer-events: none; white-space: nowrap; z-index: 30;
  background: var(--mb-surface-2); border: 1px solid var(--mb-border); border-radius: 8px;
  padding: 6px 10px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}
.st-tip { position: absolute; top: -10px; }
.st-ftip { position: fixed; transform: translate(-50%, calc(-100% - 14px)); }
.st-tip-value { font-size: 0.82rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.st-tip-label { font-size: 0.72rem; color: var(--mb-text-3); }
.st-peak {
  position: absolute; top: -4px; font-size: 0.7rem; color: var(--mb-text-3); pointer-events: none;
  white-space: nowrap; font-variant-numeric: tabular-nums;
}
.st-axis { display: flex; justify-content: space-between; margin-top: 6px; font-size: 0.72rem; color: var(--mb-text-3); }

/* ---------- punchcard ---------- */
.st-punch { display: grid; grid-template-columns: 34px repeat(24, minmax(0, 1fr)); gap: 3px; }
.st-punch-corner { height: 14px; }
.st-punch-hour { font-size: 0.62rem; color: var(--mb-text-3); white-space: nowrap; }
.st-punch-day { font-size: 0.7rem; color: var(--mb-text-3); display: flex; align-items: center; }
.st-punch-cell {
  height: 22px; border-radius: 4px; background: rgba(var(--mb-accent-rgb), var(--a));
  transition: background 0.5s ease, transform 0.12s ease, box-shadow 0.12s ease;
}
.st-punch-cell:hover { transform: scale(1.18); box-shadow: 0 0 0 1.5px rgba(var(--mb-accent-rgb), 0.9); }

/* ---------- gender pyramid ---------- */
.st-pyr-legend { display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--mb-text-3); margin-bottom: 8px; }
.st-pyr { display: flex; flex-direction: column; gap: 12px; }
.st-pyr-row { display: grid; grid-template-columns: 1fr 64px 1fr; align-items: center; gap: 6px; }
.st-pyr-label { text-align: center; font-size: 0.82rem; font-weight: 600; }
.st-pyr-side {
  display: flex; align-items: center; gap: 8px; height: 30px; padding: 0; border: 0; background: none;
  cursor: pointer; font: inherit; color: var(--mb-text-2);
}
.st-pyr-side.left { flex-direction: row; justify-content: flex-end; }
.st-pyr-side.right { justify-content: flex-start; }
.st-pyr-bar {
  height: 100%; width: 0; background: rgba(var(--mb-accent-rgb), 0.45);
  transition: width 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), background 0.15s;
}
.st-pyr-side.left .st-pyr-bar { border-radius: 6px 2px 2px 6px; }
.st-pyr-side.right .st-pyr-bar { border-radius: 2px 6px 6px 2px; background: rgba(var(--mb-accent-rgb), 0.28); }
.st-pyr-side:hover .st-pyr-bar { background: rgba(var(--mb-accent-rgb), 0.75); }
.st-pyr-val { font-size: 0.76rem; font-variant-numeric: tabular-nums; min-width: 44px; }
.st-pyr-side.left .st-pyr-val { text-align: right; }

/* ---------- heatmap ---------- */
.st-heat { display: grid; grid-template-columns: 72px repeat(3, minmax(0, 1fr)) 110px; gap: 4px; }
.st-heat-col, .st-heat-row {
  border: 0; background: none; padding: 4px; cursor: pointer; font: inherit; color: var(--mb-text-3);
  font-size: 0.72rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
}
.st-heat-col { text-align: center; }
.st-heat-col.total { cursor: default; text-align: left; padding-left: 8px; }
.st-heat-row { text-align: left; text-transform: none; letter-spacing: 0; font-size: 0.82rem; font-weight: 500; color: var(--mb-text-2); }
.st-heat-col:not(.total):hover, .st-heat-row:hover { color: var(--mb-text); }
.st-heat-cell {
  height: 38px; border: 0; border-radius: 7px; cursor: pointer; font: inherit; font-size: 0.8rem;
  font-variant-numeric: tabular-nums; color: var(--mb-text);
  background: rgba(var(--mb-accent-rgb), var(--a)); transition: background 0.6s ease, box-shadow 0.12s;
}
.st-heat-cell:hover { box-shadow: 0 0 0 1.5px rgba(var(--mb-accent-rgb), 0.9); }
.st-heat-total { position: relative; display: flex; align-items: center; padding: 0 8px; font-size: 0.8rem; font-variant-numeric: tabular-nums; color: var(--mb-text-2); }
.st-heat-total i {
  position: absolute; left: 8px; bottom: 6px; height: 2px; width: 0; max-width: calc(100% - 16px);
  border-radius: 2px; background: rgba(var(--mb-accent-rgb), 0.45); transition: width 0.9s cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* ---------- level histogram ---------- */
.st-hist { display: flex; align-items: flex-end; gap: 4px; height: 170px; }
.st-hist-col {
  flex: 1; height: 100%; display: flex; align-items: flex-end; padding: 0; border: 0; background: none; cursor: pointer;
}
.st-hist-bar {
  width: 100%; height: 0; border-radius: 4px 4px 1px 1px; background: rgba(var(--mb-accent-rgb), 0.4);
  transition: height 0.7s cubic-bezier(0.2, 0.8, 0.2, 1), background 0.15s;
}
.st-hist-col.group .st-hist-bar { background: rgba(var(--mb-accent-rgb), 0.6); }
.st-hist-col.hot .st-hist-bar { background: rgba(var(--mb-accent-rgb), 0.9); }
.st-hist-axis { display: flex; gap: 4px; margin-top: 6px; }
.st-hist-axis span { flex: 1; text-align: center; font-size: 0.66rem; color: var(--mb-text-3); white-space: nowrap; }

/* ---------- special item sets ---------- */
.st-sets { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
.st-set { border: 1px solid var(--mb-border-soft); border-radius: 12px; background: rgba(148, 163, 184, 0.02); padding: 6px; min-width: 0; }
.st-set-head {
  width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px; border: 0; border-radius: 8px;
  background: none; color: inherit; font: inherit; text-align: left; cursor: pointer;
}
.st-set-head:hover { background: var(--mb-hover); }
.st-set-head:hover .st-set-go { opacity: 1; transform: translateX(2px); }
.st-set-icon { width: 30px; height: 30px; object-fit: contain; }
.st-set-text { flex: 1; min-width: 0; }
.st-set-name { font-weight: 600; font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.st-set-meta { font-size: 0.75rem; color: var(--mb-text-3); }
.st-set-go { color: var(--mb-text-3); opacity: 0; transition: opacity 0.15s, transform 0.15s; }
.st-variants { display: flex; flex-direction: column; padding: 2px 2px 4px; }
.st-variant { position: relative; display: flex; align-items: center; gap: 8px; padding: 5px 6px 7px; font-size: 0.8rem; overflow: hidden; }
.st-variant-icon { width: 20px; height: 20px; object-fit: contain; flex: none; }
.st-variant-name { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--mb-text-2); }
.st-variant-count { font-variant-numeric: tabular-nums; color: var(--mb-text-2); font-size: 0.76rem; }
.st-variant-bar {
  position: absolute; left: 34px; bottom: 2px; height: 2px; width: 0; max-width: calc(100% - 40px);
  border-radius: 2px; background: rgba(var(--mb-accent-rgb), 0.3); transition: width 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.st-more { align-self: flex-start; margin: 4px 6px 0; border: 0; background: none; cursor: pointer; font: inherit; font-size: 0.76rem; color: var(--mb-accent); }
.st-more:hover { text-decoration: underline; }

@media (prefers-reduced-motion: reduce) {
  .st *, .st *::before { transition-duration: 0.01ms !important; transition-delay: 0ms !important; }
}
</style>
