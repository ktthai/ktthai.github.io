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
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from 'vue';

export default defineComponent({
  name: 'PlayerEquipment',
  props: {
    equipment: { type: Object, default: () => ({}) },
    itemNames: { type: Object, default: () => ({}) },
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

    return { sortedGroups, getItemName };
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
