<template>
  <div v-if="previous.length" class="spouse-row">
    <div class="spouse-card">
      <div class="spouse-header">Previous Spouses</div>
      <div class="spouse-history">
        <div v-for="p in previous" :key="p.name" class="spouse-history-row">
          <span class="spouse-history-name">{{ p.name }}</span>
          <span class="spouse-history-date" title="Last seen together">{{ formatDate(p.lastSeen) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';

// Shown above a player's equipment when they have past spouses (the current
// spouse has its own column in the table). Data comes from players.json:
// `previousSpouses` ([{ name, lastSeen }], most recent first; lastSeen = last
// time the meter saw them married).
export default defineComponent({
  name: 'SpouseCard',
  props: {
    previous: { type: Array, default: () => [] },
  },
  setup() {
    const formatDate = (t) =>
      new Date(t * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return { formatDate };
  },
});
</script>

<style scoped>
/* Same grid as PlayerEquipment so the card lines up with the first item column */
.spouse-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}
/* Same look as the equipment cards below */
.spouse-card {
  min-width: 0;
  border: 1px solid rgba(148, 163, 184, 0.07);
  border-radius: 12px;
  overflow: hidden;
  background: rgba(148, 163, 184, 0.025);
}
.spouse-header {
  padding: 8px 12px 4px;
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mb-text-3);
}
.spouse-history {
  padding: 2px 12px 10px;
}
.spouse-history-row { display: flex; flex-direction: column; padding: 3px 0; min-width: 0; }
.spouse-history-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--mb-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.spouse-history-date {
  font-size: 0.68rem;
  color: var(--mb-text-3);
  font-variant-numeric: tabular-nums;
}
</style>
