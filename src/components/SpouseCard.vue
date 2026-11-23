<template>
  <div v-if="spouse || previous.length" class="spouse-row">
    <div class="spouse-card" :class="{ divorced: !spouse }">
      <div class="spouse-header">Spouse</div>
      <div class="spouse-body">
        <span class="spouse-icon"><img :src="ringIcon" alt="" width="21" height="21" /></span>
        <span v-if="spouse" class="spouse-name">{{ spouse }}</span>
        <span v-else class="spouse-divorced">Divorced</span>
      </div>
      <div v-if="previous.length" class="spouse-history">
        <div class="spouse-history-label">Previously</div>
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

// Shown above a player's equipment when they are, or were, married.
// Data comes from players.json: `spouse` (current) and `previousSpouses`
// ([{ name, lastSeen }], most recent first; lastSeen = last time the meter saw them married).
export default defineComponent({
  name: 'SpouseCard',
  props: {
    spouse: { type: String, default: '' },
    previous: { type: Array, default: () => [] },
  },
  setup() {
    const formatDate = (t) =>
      new Date(t * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    // Served from public/ (src/assets/ is gitignored in this repo)
    const ringIcon = `${import.meta.env.BASE_URL}wedding-ring.png`;
    return { ringIcon, formatDate };
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
/* Same look as the equipment cards below; the ring icon is the only accent */
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
.spouse-body {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 12px 10px;
}
.spouse-icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(var(--mb-accent-rgb), 0.1);
  flex-shrink: 0;
}
.spouse-icon img { image-rendering: pixelated; }
.spouse-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--mb-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Divorced, not remarried: same card, muted ring */
.spouse-card.divorced .spouse-icon { background: rgba(148, 163, 184, 0.06); }
.spouse-card.divorced .spouse-icon img { filter: grayscale(1); opacity: 0.5; }
.spouse-divorced { font-size: 0.85rem; font-style: italic; color: var(--mb-text-3); }

.spouse-history {
  border-top: 1px solid rgba(148, 163, 184, 0.07);
  padding: 6px 12px 10px;
}
.spouse-history-label {
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mb-text-3);
  margin-bottom: 2px;
}
.spouse-history-row { display: flex; flex-direction: column; padding: 3px 0; min-width: 0; }
.spouse-history-name {
  font-size: 0.8rem;
  color: var(--mb-text-2);
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
