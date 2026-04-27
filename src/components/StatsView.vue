<template>
  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col>
        <div class="text-h6 font-weight-bold">Population Statistics</div>
        <div class="text-caption text-grey">Based on {{ totalPlayers.toLocaleString() }} tracked players</div>
      </v-col>
    </v-row>

    <v-row>
      <!-- Server Distribution -->
      <v-col cols="12" lg="7">
        <v-card>
          <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold pb-0">
            <v-icon size="18" class="mr-2">mdi-server</v-icon>
            Server Distribution
          </v-card-title>
          <v-card-text>
            <v-row align="center">
              <v-col cols="12" sm="5">
                <v-table density="compact">
                  <thead>
                    <tr>
                      <th class="text-caption text-uppercase text-grey">Server</th>
                      <th class="text-caption text-uppercase text-grey text-right">Count</th>
                      <th class="text-caption text-uppercase text-grey text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in serverStats" :key="row.name">
                      <td>
                        <span
                          class="d-inline-block mr-2"
                          style="width:10px;height:10px;border-radius:50%;vertical-align:middle;"
                          :style="{ background: SERVER_COLORS[row.name] || '#757575' }"
                        ></span>
                        {{ row.name }}
                      </td>
                      <td class="text-right">{{ row.count.toLocaleString() }}</td>
                      <td class="text-right text-grey">{{ row.pct.toFixed(1) }}%</td>
                    </tr>
                    <tr style="border-top: 1px solid rgba(255,255,255,0.12);">
                      <td class="font-weight-bold">Total</td>
                      <td class="text-right font-weight-bold">{{ totalPlayers.toLocaleString() }}</td>
                      <td class="text-right text-grey">100%</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-col>
              <v-col cols="12" sm="7">
                <svg
                  :viewBox="`0 0 280 ${SERVERS.length * 36 + 10}`"
                  :height="SERVERS.length * 36 + 10"
                  width="100%"
                  style="display:block;"
                >
                  <g v-for="(row, i) in serverStats" :key="row.name">
                    <rect
                      :x="0"
                      :y="i * 36 + 4"
                      width="280"
                      height="26"
                      rx="4"
                      fill="#2a2a2a"
                    />
                    <rect
                      :x="0"
                      :y="i * 36 + 4"
                      :width="row.pct * 2.8"
                      height="26"
                      rx="4"
                      :fill="SERVER_COLORS[row.name] || '#757575'"
                      opacity="0.85"
                    />
                    <text
                      x="8"
                      :y="i * 36 + 21"
                      fill="white"
                      font-size="12"
                      font-weight="600"
                      font-family="inherit"
                    >{{ row.name }}</text>
                    <text
                      x="272"
                      :y="i * 36 + 21"
                      fill="rgba(255,255,255,0.65)"
                      font-size="11"
                      text-anchor="end"
                      font-family="inherit"
                    >{{ row.count.toLocaleString() }} ({{ row.pct.toFixed(1) }}%)</text>
                  </g>
                </svg>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Race Distribution -->
      <v-col cols="12" lg="5">
        <v-card>
          <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold pb-0">
            <v-icon size="18" class="mr-2">mdi-account-group</v-icon>
            Race Distribution
          </v-card-title>
          <v-card-text>
            <v-row align="center">
              <v-col cols="12" sm="5">
                <v-table density="compact">
                  <thead>
                    <tr>
                      <th class="text-caption text-uppercase text-grey">Race</th>
                      <th class="text-caption text-uppercase text-grey text-right">Count</th>
                      <th class="text-caption text-uppercase text-grey text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in raceStats" :key="row.name">
                      <td>
                        <span
                          class="d-inline-block mr-2"
                          style="width:10px;height:10px;border-radius:50%;vertical-align:middle;"
                          :style="{ background: RACE_COLORS[row.name] || '#757575' }"
                        ></span>
                        {{ row.name }}
                      </td>
                      <td class="text-right">{{ row.count.toLocaleString() }}</td>
                      <td class="text-right text-grey">{{ row.pct.toFixed(1) }}%</td>
                    </tr>
                    <tr style="border-top: 1px solid rgba(255,255,255,0.12);">
                      <td class="font-weight-bold">Total</td>
                      <td class="text-right font-weight-bold">{{ totalPlayers.toLocaleString() }}</td>
                      <td class="text-right text-grey">100%</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-col>
              <v-col cols="12" sm="7" class="d-flex flex-column align-center">
                <svg viewBox="0 0 240 240" width="200" height="200" style="display:block;">
                  <g v-if="raceSlices.length > 0">
                    <path
                      v-for="slice in raceSlices"
                      :key="slice.name"
                      :d="slice.path"
                      :fill="slice.color"
                      :opacity="hovered === null || hovered === slice.name ? 1 : 0.5"
                      style="transition: opacity 0.2s, transform 0.2s; transform-origin: 120px 120px;"
                      :style="hovered === slice.name ? { transform: 'scale(1.05)' } : {}"
                      @mouseenter="hovered = slice.name"
                      @mouseleave="hovered = null"
                      cursor="pointer"
                    />
                  </g>
                  <!-- Empty state ring -->
                  <circle v-else cx="120" cy="120" r="100" fill="#2a2a2a" />
                  <circle cx="120" cy="120" r="62" style="fill: rgb(var(--v-theme-surface)); transition: none;" />
                  <!-- Center label -->
                  <text
                    x="120"
                    y="113"
                    text-anchor="middle"
                    fill="white"
                    font-size="20"
                    font-weight="700"
                    font-family="inherit"
                  >{{ centerLabel.value }}</text>
                  <text
                    x="120"
                    y="133"
                    text-anchor="middle"
                    fill="#9e9e9e"
                    font-size="11"
                    font-family="inherit"
                  >{{ centerLabel.sub }}</text>
                  <!-- invisible overlay rects to keep hover active over hole -->
                  <circle cx="120" cy="120" r="62" fill="transparent"
                    @mouseenter="hovered = null" />
                </svg>
                <!-- Legend -->
                <div class="d-flex justify-center flex-wrap mt-2" style="gap: 16px;">
                  <div v-for="slice in raceSlices" :key="slice.name" class="d-flex align-center" style="gap:6px;">
                    <span
                      style="display:inline-block;width:12px;height:12px;border-radius:3px;"
                      :style="{ background: slice.color }"
                    ></span>
                    <span class="text-caption">{{ slice.name }}</span>
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Level Distribution & Guild Distribution -->
    <v-row class="mt-4">

      <!-- Level Distribution -->
      <v-col cols="12" lg="6">
        <v-card>
          <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold pb-0">
            <v-icon size="18" class="mr-2">mdi-chart-bar</v-icon>
            Level Distribution
          </v-card-title>
          <v-card-text>
            <div v-if="levelBuckets.length === 0" class="text-grey text-caption">
              No level data available.
            </div>
            <template v-else>
              <div class="text-caption text-grey mb-2">
                Hover a bar for exact count · overflow bucket
                <span style="display:inline-block;width:10px;height:10px;background:#FFD54F;border-radius:2px;vertical-align:middle;"></span>
                captures players above 100k
              </div>
              <svg viewBox="0 0 400 172" width="100%" style="display:block;">
                <!-- Y-axis gridlines + labels -->
                <g v-for="tick in levelAxisLabels" :key="tick.y">
                  <line
                    x1="40" :y1="tick.y" x2="390" :y2="tick.y"
                    stroke="rgba(255,255,255,0.08)" stroke-width="1"
                  />
                  <text
                    x="36" :y="tick.y + 4"
                    text-anchor="end"
                    fill="#9e9e9e" font-size="9" font-family="inherit"
                  >{{ tick.text }}</text>
                </g>
                <!-- Bars -->
                <g
                  v-for="(bar, i) in levelHistogramBars"
                  :key="i"
                  @mouseenter="levelHovered = i"
                  @mouseleave="levelHovered = null"
                  cursor="pointer"
                >
                  <rect
                    :x="bar.x" :y="bar.y" :width="bar.width" :height="bar.height"
                    :fill="bar.color"
                    :opacity="levelHovered === null || levelHovered === i ? (bar.isOverflow ? 0.75 : 0.82) : 0.2"
                    rx="2"
                    style="transition: opacity 0.15s;"
                  />
                  <!-- X-axis label -->
                  <text
                    :x="bar.x + bar.width / 2" y="166"
                    text-anchor="middle"
                    fill="#9e9e9e" font-size="8" font-family="inherit"
                  >{{ bar.label }}</text>
                </g>
                <!-- Hover count label above bar -->
                <g v-if="levelHovered !== null && levelHistogramBars[levelHovered]">
                  <text
                    :x="levelHistogramBars[levelHovered].x + levelHistogramBars[levelHovered].width / 2"
                    :y="levelHistogramBars[levelHovered].y - 5"
                    text-anchor="middle"
                    fill="white" font-size="9" font-weight="600" font-family="inherit"
                  >{{ levelHistogramBars[levelHovered].count.toLocaleString() }}</text>
                </g>
              </svg>
            </template>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Top Guilds -->
      <v-col cols="12" lg="6">
        <v-card>
          <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold pb-0">
            <v-icon size="18" class="mr-2">mdi-shield-account</v-icon>
            Top Active Guilds
          </v-card-title>
          <v-card-text>
            <div v-if="guildStats.length === 0" class="text-grey text-caption">
              No guild data available.
            </div>
            <template v-else>
              <div class="text-caption text-grey mb-2">
                {{ totalGuildedPlayers.toLocaleString() }} players in guilds · showing top {{ guildStats.length }}
              </div>
              <svg
                :viewBox="`0 0 340 ${guildChartHeight}`"
                :height="guildChartHeight"
                width="100%"
                style="display:block;"
              >
                <g v-for="(row, i) in guildStats" :key="row.name">
                  <rect :x="0" :y="i * 36 + 4" width="340" height="30" rx="4" fill="#2a2a2a" />
                  <rect
                    :x="0" :y="i * 36 + 4"
                    :width="(row.count / guildStats[0].count) * 340"
                    height="30" rx="4"
                    :fill="row.color" opacity="0.82"
                  />
                  <text
                    x="8" :y="i * 36 + 23"
                    fill="white" font-size="12" font-weight="600" font-family="inherit"
                  >
                    {{ row.displayName }}
                    <title>{{ row.name }}</title>
                  </text>
                  <text
                    x="332" :y="i * 36 + 23"
                    fill="rgba(255,255,255,0.65)" font-size="11"
                    text-anchor="end" font-family="inherit"
                  >{{ row.count.toLocaleString() }} ({{ row.pct.toFixed(1) }}%)</text>
                </g>
              </svg>
            </template>
          </v-card-text>
        </v-card>
      </v-col>

    </v-row>
  </v-container>
</template>

<script>
import { defineComponent, computed, ref } from 'vue';
import { getServer, getRaceBase } from '../utils/playerStats.js';

const SERVERS = ['Mari', 'Ruairi', 'Tarlach', 'Nao', 'Alexina', 'Erinn'];
const RACES   = ['Human', 'Elf', 'Giant'];

const SERVER_COLORS = {
  Mari:    '#4FC3F7',
  Ruairi:  '#81C784',
  Tarlach: '#FFD54F',
  Nao:     '#F48FB1',
  Alexina: '#CE93D8',
  Erinn:   '#80DEEA',
};

const RACE_COLORS = {
  Human: '#64B5F6',
  Elf:   '#A5D6A7',
  Giant: '#EF9A9A',
};

const LEVEL_BAR_COLOR      = '#64B5F6';
const LEVEL_OVERFLOW_COLOR = '#FFD54F';

const GUILD_COLORS = [
  '#4FC3F7', '#81C784', '#FFD54F', '#F48FB1',
  '#CE93D8', '#80DEEA', '#64B5F6', '#A5D6A7',
  '#EF9A9A', '#FFCC80',
];

function polarToXY(cx, cy, r, deg) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(cx, cy, oR, iR, start, end) {
  const os  = polarToXY(cx, cy, oR, start);
  const oe  = polarToXY(cx, cy, oR, end);
  const ie  = polarToXY(cx, cy, iR, end);
  const is_ = polarToXY(cx, cy, iR, start);
  const la  = end - start > 180 ? 1 : 0;
  return `M${os.x} ${os.y} A${oR} ${oR} 0 ${la} 1 ${oe.x} ${oe.y} L${ie.x} ${ie.y} A${iR} ${iR} 0 ${la} 0 ${is_.x} ${is_.y}Z`;
}

function formatCount(n) {
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'k';
  return String(n);
}

export default defineComponent({
  name: 'StatsView',
  props: {
    players: { type: Array, required: true },
  },
  setup(props) {
    const hovered     = ref(null);
    const levelHovered = ref(null);

    const serverStats = computed(() => {
      const counts = Object.fromEntries(SERVERS.map(s => [s, 0]));
      for (const p of props.players) {
        const s = getServer(p.id);
        if (counts[s] !== undefined) counts[s]++;
      }
      const total = props.players.length;
      return SERVERS.map(name => ({
        name,
        count: counts[name],
        pct: total ? (counts[name] / total) * 100 : 0,
      }));
    });

    const raceStats = computed(() => {
      const counts = Object.fromEntries(RACES.map(r => [r, 0]));
      for (const p of props.players) {
        const base = getRaceBase(p.race);
        if (counts[base] !== undefined) counts[base]++;
      }
      const total = props.players.length;
      return RACES.map(name => ({
        name,
        count: counts[name],
        pct: total ? (counts[name] / total) * 100 : 0,
      }));
    });

    const raceSlices = computed(() => {
      const slices = [];
      let cursor = 0;
      for (const row of raceStats.value) {
        if (row.pct === 0) continue;
        const sweep = (row.pct / 100) * 360;
        const end = cursor + sweep;
        slices.push({
          name:  row.name,
          count: row.count,
          pct:   row.pct,
          color: RACE_COLORS[row.name] || '#757575',
          path:  slicePath(120, 120, 100, 62, cursor, end),
        });
        cursor = end;
      }
      return slices;
    });

    const totalPlayers = computed(() => props.players.length);

    const centerLabel = computed(() => {
      if (hovered.value) {
        const slice = raceSlices.value.find(s => s.name === hovered.value);
        if (slice) return { value: slice.count.toLocaleString(), sub: slice.name };
      }
      return { value: props.players.length.toLocaleString(), sub: 'Players' };
    });

    // --- Level Distribution ---

    const levelBuckets = computed(() => {
      const levels = props.players.map(p => p.totalLevel).filter(v => v > 0);
      if (levels.length === 0) return [];

      const BUCKET_SIZE = 10000;
      const OVERFLOW_AT = 100000;
      const numBuckets  = OVERFLOW_AT / BUCKET_SIZE; // 10

      const buckets = [];
      for (let k = 0; k < numBuckets; k++) {
        const lo = k * BUCKET_SIZE / 1000;
        const hi = (k + 1) * BUCKET_SIZE / 1000;
        buckets.push({ label: `${lo}-${hi}k`, count: 0, isOverflow: false });
      }
      buckets.push({ label: '100k+', count: 0, isOverflow: true });

      for (const lv of levels) {
        if (lv >= OVERFLOW_AT) {
          buckets[buckets.length - 1].count++;
        } else {
          const idx = Math.floor(lv / BUCKET_SIZE);
          if (idx >= 0 && idx < numBuckets) buckets[idx].count++;
        }
      }

      return buckets;
    });

    const levelHistogramBars = computed(() => {
      const buckets = levelBuckets.value;
      if (buckets.length === 0) return [];

      const plotX = 40, plotY = 20, plotW = 350, plotH = 120;
      const maxCount = Math.max(...buckets.map(b => b.count));
      const n = buckets.length;
      const barW = Math.max(1, plotW / n - 2);

      return buckets.map((b, i) => {
        const barH = maxCount > 0 ? (b.count / maxCount) * plotH : 0;
        return {
          x:          plotX + i * (plotW / n),
          y:          plotY + plotH - barH,
          width:      barW,
          height:     barH,
          label:      b.label,
          count:      b.count,
          isOverflow: b.isOverflow,
          color:      b.isOverflow ? LEVEL_OVERFLOW_COLOR : LEVEL_BAR_COLOR,
        };
      });
    });

    const levelAxisLabels = computed(() => {
      const buckets = levelBuckets.value;
      if (buckets.length === 0) return [];

      const plotY = 20, plotH = 120;
      const maxCount = Math.max(...buckets.map(b => b.count));
      const ticks = 4;

      return Array.from({ length: ticks + 1 }, (_, i) => {
        const frac = i / ticks;
        const count = Math.round(maxCount * frac);
        const y = plotY + plotH - frac * plotH;
        return { y, text: formatCount(count) };
      });
    });

    // --- Guild Distribution ---

    const totalGuildedPlayers = computed(() =>
      props.players.filter(p => p.guild?.trim()).length
    );

    const guildStats = computed(() => {
      const map = new Map();
      for (const p of props.players) {
        const g = p.guild?.trim();
        if (!g) continue;
        map.set(g, (map.get(g) || 0) + 1);
      }

      const total = totalGuildedPlayers.value;
      const sorted = [...map.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 10);

      return sorted.map(([name, count], i) => ({
        name,
        displayName: name.length > 20 ? name.slice(0, 20) + '…' : name,
        count,
        pct: total > 0 ? (count / total) * 100 : 0,
        color: GUILD_COLORS[i % GUILD_COLORS.length],
      }));
    });

    const guildChartHeight = computed(() => guildStats.value.length * 36 + 10);

    return {
      totalPlayers,
      hovered,
      serverStats,
      raceStats,
      raceSlices,
      centerLabel,
      levelHovered,
      levelBuckets,
      levelHistogramBars,
      levelAxisLabels,
      totalGuildedPlayers,
      guildStats,
      guildChartHeight,
      SERVERS,
      SERVER_COLORS,
      RACE_COLORS,
      LEVEL_BAR_COLOR,
      LEVEL_OVERFLOW_COLOR,
      GUILD_COLORS,
    };
  },
});
</script>
