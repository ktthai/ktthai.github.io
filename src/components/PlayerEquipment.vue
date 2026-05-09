<template>
  <div class="equipment-grid">
    <div v-for="group in sortedGroups" :key="group.name" class="equipment-card">
      <div class="equipment-header">{{ group.name }}</div>
      <div class="equipment-list">
        <div v-for="equip in group.items" :key="equip.uniqueId" class="equipment-item">
          <div class="item-details">
            <div class="item-name">{{ getItemName(equip.itemId) }}</div>
            <div class="item-uid">UID: {{ equip.uniqueId }}</div>
          </div>
          <v-btn
            v-if="itemHistory[equip.uniqueId]"
            icon="mdi-history"
            size="x-small"
            variant="text"
            density="compact"
            @click="showHistory(equip.uniqueId, equip.itemId)"
          />
        </div>
      </div>
    </div>
  </div>

  <v-dialog v-model="historyDialog.open" max-width="400">
    <v-card>
      <v-card-title class="text-body-1">{{ historyDialog.title }}</v-card-title>
      <v-card-subtitle class="text-caption pb-1">Item ownership history</v-card-subtitle>
      <v-divider />
      <v-list density="compact">
        <v-list-item
          v-for="(entry, i) in historyDialog.owners"
          :key="i"
        >
          <v-list-item-title>{{ entry.name }}</v-list-item-title>
          <template v-slot:append>
            <span class="text-caption text-grey">{{ entry.lastSeen }}</span>
          </template>
        </v-list-item>
      </v-list>
      <v-card-actions>
        <v-spacer />
        <v-btn size="small" @click="historyDialog.open = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { defineComponent, computed, ref } from 'vue';

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
      const entries = props.itemHistory[uniqueId] || [];
      historyDialog.value = {
        open: true,
        title: getItemName(itemId),
        owners: entries.map((e) => ({
          name: props.playerById[e.id] || e.id,
          lastSeen: new Date(e.lastSeen * 1000).toLocaleString(),
        })),
      };
    };

    return { sortedGroups, getItemName, historyDialog, showHistory };
  },
});
</script>

<style scoped>
.equipment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 8px;
  padding: 4px;
}
.equipment-card {
  border: 1px solid #424242;
  border-radius: 4px;
  overflow: hidden;
  background-color: #1e1e1e;
  display: flex;
  flex-direction: column;
}
.equipment-header {
  background-color: #2c2c2c;
  padding: 4px 12px;
  font-weight: 700;
  font-size: 0.875rem;
  color: #e0e0e0;
  border-bottom: 1px solid #424242;
}
.equipment-list { display: flex; flex-direction: column; }
.equipment-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #333;
}
.equipment-item:last-child { border-bottom: none; }
.item-details { flex: 1; overflow: hidden; }
.item-name {
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #e0e0e0;
}
.item-uid { font-size: 0.7rem; color: #9e9e9e; }
</style>
