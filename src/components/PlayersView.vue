<template>
  <v-card style="overflow: visible;">
    <div style="position: sticky; top: 0; z-index: 10;" class="bg-surface">
    <v-card-title class="d-flex align-center flex-wrap">
      Players Cache
      <div v-if="searchStats.total > 0 && debouncedSearch" class="d-flex align-center ml-4" style="gap: 8px">
        <v-chip
          size="small"
          :color="activeFilter === null ? 'primary' : 'default'"
          variant="flat"
          @click="activeFilter = null"
        >
          All ({{ searchStats.total }})
        </v-chip>
        <v-chip
          v-if="searchStats.name > 0"
          size="small"
          :color="activeFilter === 'name' ? 'primary' : 'default'"
          variant="flat"
          @click="activeFilter = activeFilter === 'name' ? null : 'name'"
        >
          Names ({{ searchStats.name }})
        </v-chip>
        <v-chip
          v-if="searchStats.item > 0"
          size="small"
          :color="activeFilter === 'item' ? 'primary' : 'default'"
          variant="flat"
          @click="activeFilter = activeFilter === 'item' ? null : 'item'"
        >
          Items ({{ searchStats.item }})
        </v-chip>
        <v-chip
          v-if="searchStats.guild > 0"
          size="small"
          :color="activeFilter === 'guild' ? 'primary' : 'default'"
          variant="flat"
          @click="activeFilter = activeFilter === 'guild' ? null : 'guild'"
        >
          Guilds ({{ searchStats.guild }})
        </v-chip>
        <v-chip
          v-if="searchStats.race > 0"
          size="small"
          :color="activeFilter === 'race' ? 'primary' : 'default'"
          variant="flat"
          @click="activeFilter = activeFilter === 'race' ? null : 'race'"
        >
          Races ({{ searchStats.race }})
        </v-chip>
      </div>
      <span v-else class="text-subtitle-1 text-grey ml-2">
        ({{ filteredPlayerList.length }} found)
      </span>
    </v-card-title>

    <v-card-text>
      <v-text-field
        v-model="search"
        append-icon="mdi-magnify"
        label="Search (Name, Guild, Race, Item)"
        single-line
        hide-details
      ></v-text-field>
    </v-card-text>
    </div>

    <v-data-table
      :headers="headers"
      :items="filteredPlayerList"
      item-value="id"
      show-expand
      :items-per-page="50"
      :items-per-page-options="[25, 50, 100, 200]"
    >
      <template v-slot:item.name="{ item }">
        <div class="d-flex align-center">
          {{ item.name }}
          <v-chip
            v-if="getNewTag(item)"
            size="x-small"
            :color="getNewTag(item)?.color"
            class="ml-2"
            variant="flat"
          >
            {{ getNewTag(item)?.text }}
          </v-chip>
        </div>
      </template>

      <template v-slot:item.specialItems="{ item }">
        <div class="d-flex align-center">
          <div v-for="(badge, index) in getPlayerBadges(item)" :key="index" class="mr-1">
            <v-tooltip location="top">
              <template v-slot:activator="{ props }">
                <img
                  :src="`/items/${getIconId(badge.itemId)}.png`"
                  height="24"
                  width="24"
                  v-bind="props"
                  style="object-fit: contain;"
                  :alt="badge.name"
                />
              </template>
              <span>{{ badge.name }}</span>
            </v-tooltip>
          </div>
        </div>
      </template>

      <template v-slot:item.id="{ item }">
        {{ parseInt(item.id, 16) }}
      </template>

      <template v-slot:item.race="{ item }">
        {{ item.race }}
      </template>

      <template v-slot:item.server="{ item }">
        {{ getServer(item.id) }}
      </template>

      <template v-slot:item.lastSeen="{ item }">
        {{ new Date(item.lastSeen * 1000).toLocaleString() }}
      </template>

      <template v-slot:bottom="slotProps">
        <div style="position: sticky; bottom: 0; z-index: 10;" class="bg-surface">
          <v-data-table-footer v-bind="slotProps" :items-per-page-options="[25, 50, 100, 200]" />
        </div>
      </template>

      <template v-slot:expanded-row="{ columns, item }">
        <tr>
          <td :colspan="columns.length">
            <PlayerEquipment
              :equipment="item.equipment"
              :item-names="itemNames"
            />
          </td>
        </tr>
      </template>
    </v-data-table>
  </v-card>
</template>

<script>
import { defineComponent, ref, computed, watch } from 'vue';
import PlayerEquipment from './PlayerEquipment.vue';
import { getServer } from '../utils/playerStats.js';

export default defineComponent({
  name: 'PlayersView',
  components: { PlayerEquipment },
  props: {
    players: { type: Array, default: () => [] },
    itemNames: { type: Object, default: () => ({}) },
  },
  setup(props) {
    const search = ref('');
    const debouncedSearch = ref('');
    const activeFilter = ref(null);
    let debounceTimeout;

    const headers = [
      { title: 'ID', key: 'id' },
      { title: 'Name', key: 'name' },
      { title: 'Items', key: 'specialItems', sortable: false },
      { title: 'Guild', key: 'guild' },
      { title: 'Race', key: 'race', sortable: false },
      { title: 'Total Level', key: 'totalLevel' },
      { title: 'Server', key: 'server', sortable: false },
      { title: 'Last Seen', key: 'lastSeen' },
      { title: '', key: 'data-table-expand' },
    ];

    const specialItemSets = [
      { name: "Unfinished Reverie's Diadem Halo", items: [3160099, 3160151] },
      {
        name: 'Soul Liberator',
        items: [
          1000059, 1010070, 1020004, 1040054, 104055, 1050017, 1060011, 1070014, 1080048, 1090010,
          1200043, 1210067, 1220018, 1230039, 1250026, 1260020, 1270029, 1280018, 1400011, 1400012,
          1420006, 1420007, 1430005, 1440006, 1460003, 1640003, 1640004, 1650001, 41233,
        ],
      },
      { name: 'Destructive Robe', items: [19406, 19407] },
      { name: "Irusan's Bell", items: [3100003] },
    ];

    const specialItemMap = new Map();
    for (const set of specialItemSets) {
      for (const id of set.items) specialItemMap.set(id, set.name);
    }

    const getPlayerBadges = (player) => {
      const badges = [];
      if (!player.equipment) return badges;
      const seen = new Set();
      for (const itemData of Object.values(player.equipment)) {
        const itemId = typeof itemData === 'number' ? itemData : itemData.itemId;
        if (specialItemMap.has(itemId) && !seen.has(itemId)) {
          seen.add(itemId);
          badges.push({ itemId, name: specialItemMap.get(itemId) });
        }
      }
      return badges;
    };

    const getNewTag = (player) => {
      if (!player.firstSeen) return null;
      const diff = Date.now() / 1000 - player.firstSeen;
      if (diff < 86400) return { text: 'Added Today', color: 'green' };
      if (diff < 604800) return { text: 'Added This Week', color: 'blue' };
      return null;
    };

    const getItemName = (id) => {
      const key = String(id);
      return props.itemNames[key] || `Unknown Item (${id})`;
    };

    const getIconId = (itemId) => {
      const aliases = { 3160151: 3160099, 104055: 1040055, 1640003: 1640004 };
      return aliases[itemId] ?? itemId;
    };

    const buildSearchString = (player) => {
      let s = `${player.name || ''} ${player.guild || ''} ${player.totalLevel || ''} ${player.race || ''}`.toLowerCase();
      if (player.equipment) {
        for (const [uniqueId, itemData] of Object.entries(player.equipment)) {
          const itemId = typeof itemData === 'number' ? itemData : itemData.itemId;
          s += ` ${getItemName(itemId).toLowerCase()} ${uniqueId}`;
        }
      }
      return s;
    };

    const enrichedPlayers = computed(() =>
      props.players.map((p) => ({ ...p, _searchString: buildSearchString(p) }))
    );

    watch(search, (val) => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        debouncedSearch.value = val;
        activeFilter.value = null;
      }, 300);
    });

    const broadlyMatchedPlayers = computed(() => {
      if (!debouncedSearch.value) return enrichedPlayers.value;
      const q = debouncedSearch.value.toLowerCase();
      return enrichedPlayers.value.filter((p) => p._searchString.includes(q));
    });

    const searchStats = computed(() => {
      const list = broadlyMatchedPlayers.value;
      if (!debouncedSearch.value) return { total: list.length, name: 0, item: 0, guild: 0, race: 0 };
      const q = debouncedSearch.value.toLowerCase();
      let name = 0, item = 0, guild = 0, race = 0;
      for (const p of list) {
        if (p.name?.toLowerCase().includes(q)) name++;
        if (p.guild?.toLowerCase().includes(q)) guild++;
        if (p.race?.toLowerCase().includes(q)) race++;
        if (p.equipment) {
          for (const [uid, d] of Object.entries(p.equipment)) {
            const id = typeof d === 'number' ? d : d.itemId;
            if (getItemName(id).toLowerCase().includes(q) || uid.includes(q)) { item++; break; }
          }
        }
      }
      return { total: list.length, name, item, guild, race };
    });

    const filteredPlayerList = computed(() => {
      const list = broadlyMatchedPlayers.value;
      if (!activeFilter.value || !debouncedSearch.value) return list;
      const q = debouncedSearch.value.toLowerCase();
      return list.filter((p) => {
        if (activeFilter.value === 'name') return p.name?.toLowerCase().includes(q);
        if (activeFilter.value === 'guild') return p.guild?.toLowerCase().includes(q);
        if (activeFilter.value === 'race') return p.race?.toLowerCase().includes(q);
        if (activeFilter.value === 'item' && p.equipment) {
          for (const [uid, d] of Object.entries(p.equipment)) {
            const id = typeof d === 'number' ? d : d.itemId;
            if (getItemName(id).toLowerCase().includes(q) || uid.includes(q)) return true;
          }
        }
        return false;
      });
    });

    return {
      search,
      debouncedSearch,
      activeFilter,
      headers,
      filteredPlayerList,
      searchStats,
      getPlayerBadges,
      getNewTag,
      getIconId,
      getServer,
    };
  },
});
</script>
