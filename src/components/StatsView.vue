<template>
  <div class="st" :class="{ ready }">
    <header class="st-head">
      <h1>Special Item Sets</h1>
      <span class="st-sub">Based on {{ totalPlayers.toLocaleString() }} tracked players · click a set to explore its owners</span>
    </header>

    <!-- Special item sets -->
    <section class="st-card">
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
  </div>
</template>

<script>
import { defineComponent, computed, reactive } from 'vue';
import { specialItemSets, specialItemMap } from '../utils/specialItems.js';
import { useReady } from '../utils/statsCharts.js';

const VARIANT_PREVIEW = 5;

export default defineComponent({
  name: 'StatsView',
  props: {
    players: { type: Array, required: true },
    itemNames: { type: Object, default: () => ({}) },
  },
  emits: ['open-players'],
  setup(props, { emit }) {
    const ready = useReady();
    const expandedSets = reactive(new Set());

    const open = (filters) => emit('open-players', { filters });
    const totalPlayers = computed(() => props.players.length);

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
      VARIANT_PREVIEW, ready, expandedSets, open, totalPlayers,
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

.st-card {
  background: var(--mb-surface); border: 1px solid var(--mb-border); border-radius: 14px;
  padding: 16px 18px 18px; min-width: 0;
}
.st-card-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.st-card-head h2 { margin: 0; font-size: 0.95rem; font-weight: 600; }

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
