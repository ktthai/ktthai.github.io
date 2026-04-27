<template>
  <v-container fluid class="pa-4">
    <v-row class="mb-4" align="center">
      <v-col>
        <div class="text-h6 font-weight-bold">Name Changes</div>
        <div class="text-caption text-grey">{{ rows.length.toLocaleString() }} players with recorded name changes</div>
      </v-col>
      <v-col cols="12" sm="4">
        <v-text-field
          v-model="search"
          density="compact"
          variant="outlined"
          placeholder="Search by name or ID..."
          prepend-inner-icon="mdi-magnify"
          clearable
          hide-details
        />
      </v-col>
    </v-row>

    <v-card>
      <v-data-table
        :headers="headers"
        :items="filteredRows"
        :items-per-page="50"
        :items-per-page-options="[25, 50, 100, 200]"
        density="compact"
        class="name-changes-table"
      >
        <template #item.decimalId="{ item }">
          <span class="text-caption text-grey">{{ item.decimalId }}</span>
        </template>

        <template #item.nameChain="{ item }">
          <span>
            <template v-for="(name, i) in item.names" :key="i">
              <span
                :class="i === item.names.length - 1 ? 'text-primary font-weight-medium' : 'text-medium-emphasis'"
              >{{ name }}</span>
              <span v-if="i < item.names.length - 1" class="text-grey mx-1">→</span>
            </template>
          </span>
        </template>

        <template #item.server="{ item }">
          <span class="text-caption">{{ item.server }}</span>
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script>
import { defineComponent, ref, computed } from 'vue';
import { getServer } from '../utils/playerStats.js';

export default defineComponent({
  name: 'NameChangesView',
  props: {
    nameChanges: { type: Object, required: true },
  },
  setup(props) {
    const search = ref('');

    const headers = [
      { title: 'ID', key: 'decimalId', width: '110px', sortable: true },
      { title: 'Name History', key: 'nameChain', sortable: false },
      { title: 'Server', key: 'server', width: '100px', sortable: true },
    ];

    const rows = computed(() => {
      const changes = props.nameChanges?.changes || {};
      return Object.entries(changes).map(([hexId, names]) => ({
        hexId,
        decimalId: parseInt(hexId, 16),
        names,
        server: getServer(hexId),
        searchText: [String(parseInt(hexId, 16)), ...names].join(' ').toLowerCase(),
      }));
    });

    const filteredRows = computed(() => {
      const q = search.value?.toLowerCase().trim();
      if (!q) return rows.value;
      return rows.value.filter(r => r.searchText.includes(q));
    });

    return { search, headers, rows, filteredRows };
  },
});
</script>
