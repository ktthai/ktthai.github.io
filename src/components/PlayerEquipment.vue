<template>
  <div class="equipment-grid">
    <div v-for="group in sortedGroups" :key="group.name" class="equipment-card">
      <div class="equipment-header">{{ group.name }}</div>
      <div class="equipment-list">
        <div v-for="equip in group.items" :key="equip.uniqueId" class="equipment-item" :class="{ traded: ownerCount(equip.uniqueId) > 1 }">
          <div class="item-details">
            <div class="item-name">{{ getItemName(equip.itemId) }}</div>
            <div class="item-uid">UID: {{ equip.uniqueId }}</div>
          </div>
          <button
            v-if="itemHistory[equip.uniqueId]"
            class="item-owners"
            :title="`Owned by ${ownerCount(equip.uniqueId)} players`"
            @click.stop="showHistory(equip.uniqueId, equip.itemId)"
          >
            <v-icon size="14">mdi-history</v-icon>{{ ownerCount(equip.uniqueId) }}
          </button>
          <i v-if="ownerCount(equip.uniqueId) > 1" class="item-trade-bar" :style="{ width: tradeShare(equip.uniqueId) }" />
        </div>
      </div>
    </div>
  </div>

  <v-dialog v-model="historyDialog.open" max-width="420">
    <div class="hist">
      <div class="hist-head">
        <div>
          <div class="hist-title">{{ historyDialog.title }}</div>
          <div class="hist-sub">{{ historyDialog.owners.length }} owners · newest first</div>
        </div>
        <button class="hist-close" aria-label="Close" @click="historyDialog.open = false">
          <v-icon size="18">mdi-close</v-icon>
        </button>
      </div>
      <ol class="hist-timeline">
        <li v-for="(entry, i) in historyDialog.owners" :key="i" :class="{ latest: i === 0 }">
          <div class="hist-name">
            {{ entry.name }}
            <span v-if="i === 0" class="hist-tag">latest</span>
          </div>
          <div class="hist-when" :title="entry.full">{{ entry.ago }}</div>
        </li>
      </ol>
    </div>
  </v-dialog>
</template>

<script>
import { defineComponent, computed, ref } from 'vue';
import { relativeTime } from '../utils/playerFilters.js';

export default defineComponent({
  name: 'PlayerEquipment',
  props: {
    equipment: { type: Object, default: () => ({}) },
    itemNames: { type: Object, default: () => ({}) },
    itemHistory: { type: Object, default: () => ({}) },
    playerById: { type: Object, default: () => ({}) },
  },
  setup(props) {
    const pocketMap = {
      1: 'Head', 2: 'Body', 3: 'Face', 4: 'Hair', 5: 'Body',
      6: 'Gloves', 7: 'Shoes', 8: 'Headgear', 9: 'Robe',
      10: 'Main Hand (I)', 11: 'Main Hand (II)', 12: 'Offhand (I)',
      16: 'Accessory 1', 17: 'Accessory 2',
      43: 'Body (Style)', 44: 'Gloves (Style)', 45: 'Shoes (Style)', 46: 'Headgear (Style)',
      48: 'Facewear', 54: 'Stardust',
    };

    const sortOrder = [
      'Head', 'Headgear', 'Face', 'Facewear', 'Hair',
      'Body', 'Robe',
      'Gloves', 'Shoes',
      'Main Hand (I)', 'Offhand (I)', 'Main Hand (II)',
      'Accessory 1', 'Accessory 2', 'Stardust',
      'Headgear (Style)', 'Body (Style)', 'Gloves (Style)', 'Shoes (Style)',
    ];

    const getItemName = (id) => {
      return props.itemNames[String(id)] || `Unknown Item (${id})`;
    };

    const sortedGroups = computed(() => {
      if (!props.equipment) return [];
      const groups = {};
      for (const [uniqueId, itemData] of Object.entries(props.equipment)) {
        const itemId = typeof itemData === 'number' ? itemData : itemData.itemId;
        const pocket = typeof itemData === 'number' ? 0 : (itemData.pocket || 0);
        const pocketName = pocketMap[pocket] || `Slot ${pocket}`;
        if (!groups[pocketName]) groups[pocketName] = [];
        groups[pocketName].push({ uniqueId, itemId, pocket });
      }
      return Object.keys(groups)
        .map((name) => ({ name, items: groups[name] }))
        .sort((a, b) => {
          const ia = sortOrder.indexOf(a.name);
          const ib = sortOrder.indexOf(b.name);
          if (ia !== -1 && ib !== -1) return ia - ib;
          if (ia !== -1) return -1;
          if (ib !== -1) return 1;
          return a.name.localeCompare(b.name);
        });
    });

    const historyDialog = ref({ open: false, title: '', owners: [] });

    const showHistory = (uniqueId, itemId) => {
      const entries = [...(props.itemHistory[uniqueId] || [])].sort((a, b) => b.lastSeen - a.lastSeen);
      historyDialog.value = {
        open: true,
        title: getItemName(itemId),
        owners: entries.map((e) => ({
          name: props.playerById[e.id] || e.id,
          ago: relativeTime(e.lastSeen),
          full: new Date(e.lastSeen * 1000).toLocaleString(),
        })),
      };
    };

    const ownerCount = (uid) => props.itemHistory[uid]?.length || 0;
    // Line length grows with the number of owners (7+ owners = full width)
    const tradeShare = (uid) => `${Math.min(1, (ownerCount(uid) - 1) / 6) * 100}%`;

    return { sortedGroups, getItemName, historyDialog, showHistory, ownerCount, tradeShare };
  },
});
</script>

<style scoped>
.equipment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}
.equipment-card {
  min-width: 0;
  border: 1px solid rgba(148, 163, 184, 0.07);
  border-radius: 12px;
  overflow: hidden;
  background: rgba(148, 163, 184, 0.025);
  display: flex;
  flex-direction: column;
}
.equipment-header {
  padding: 8px 12px 4px;
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mb-text-3);
}
.equipment-list { display: flex; flex-direction: column; padding: 0 4px 4px; }
.equipment-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border-radius: 8px;
  transition: background 0.12s;
}
.equipment-item:hover { background: rgba(148, 163, 184, 0.04); }
.equipment-item { position: relative; overflow: hidden; }
.item-trade-bar {
  position: absolute; left: 8px; bottom: 2px; height: 1.5px; max-width: calc(100% - 16px);
  background: rgba(var(--mb-accent-rgb), 0.4); border-radius: 2px; pointer-events: none;
}
.item-owners {
  display: inline-flex; align-items: center; gap: 3px; padding: 2px 6px; border-radius: 6px;
  border: 0; background: none; cursor: pointer; font-size: 0.72rem; color: var(--mb-text-3);
  font-variant-numeric: tabular-nums; transition: background 0.15s, color 0.15s;
}
.item-owners:hover { background: rgba(var(--mb-accent-rgb), 0.15); color: var(--mb-text); }

.hist {
  background: var(--mb-surface-2); border: 1px solid var(--mb-border); border-radius: 14px;
  padding: 18px 20px 20px; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
}
.hist-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.hist-title { font-weight: 600; font-size: 0.95rem; color: var(--mb-text); }
.hist-sub { font-size: 0.75rem; color: var(--mb-text-3); margin-top: 2px; }
.hist-close {
  display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px;
  border: 0; background: none; color: var(--mb-text-3); cursor: pointer;
}
.hist-close:hover { background: var(--mb-hover); color: var(--mb-text); }
.hist-timeline { list-style: none; margin: 0; padding: 0 0 0 18px; position: relative; }
.hist-timeline::before {
  content: ''; position: absolute; left: 4px; top: 8px; bottom: 8px; width: 1px;
  background: linear-gradient(rgba(var(--mb-accent-rgb), 0.6), rgba(148, 163, 184, 0.15));
}
.hist-timeline li { position: relative; display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 7px 0; }
.hist-timeline li::before {
  content: ''; position: absolute; left: -14px; top: 50%; width: 8px; height: 1px;
  background: rgba(148, 163, 184, 0.35);
}
.hist-timeline li.latest::before { background: rgba(var(--mb-accent-rgb), 0.8); }
.hist-name { font-size: 0.87rem; color: var(--mb-text-2); display: flex; align-items: center; gap: 8px; }
.hist-timeline li.latest .hist-name { color: var(--mb-text); font-weight: 500; }
.hist-tag {
  font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.06em; padding: 1px 6px; border-radius: 4px;
  background: rgba(var(--mb-accent-rgb), 0.14); color: var(--mb-accent);
}
.hist-when { font-size: 0.75rem; color: var(--mb-text-3); white-space: nowrap; font-variant-numeric: tabular-nums; }
.item-details { flex: 1; overflow: hidden; }
.item-name {
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--mb-text);
}
.item-uid {
  font-family: var(--mb-mono);
  font-size: 0.68rem;
  color: var(--mb-text-3);
}
</style>
