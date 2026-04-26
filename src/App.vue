<template>
  <v-app>
    <v-main>
      <v-container fluid>
        <v-row justify="center" class="mb-2 mt-2">
          <v-col cols="12" class="text-center">
            <div class="text-h5 font-weight-bold">MabiLog</div>
            <div v-if="lastSynced" class="text-caption text-grey mt-1">
              Last synced: {{ lastSynced }} &nbsp;·&nbsp; {{ playerCount }} players
            </div>
          </v-col>
        </v-row>

        <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
          {{ error }}
        </v-alert>

        <div v-if="loading" class="d-flex justify-center align-center" style="height: 300px;">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        </div>

        <PlayersView
          v-else-if="players.length > 0"
          :players="players"
          :item-names="itemNames"
        />
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import { defineComponent, ref, onMounted } from 'vue';
import PlayersView from './components/PlayersView.vue';

const DATA_URL = 'https://raw.githubusercontent.com/ktthai/ktthai.github.io/main/players.json';

function relativeTime(unixSeconds) {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 86400 * 30) return Math.floor(diff / 86400) + 'd ago';
  if (diff < 86400 * 365) return Math.floor(diff / (86400 * 30)) + 'mo ago';
  return Math.floor(diff / (86400 * 365)) + 'y ago';
}

export default defineComponent({
  name: 'App',
  components: { PlayersView },
  setup() {
    const loading = ref(true);
    const error = ref('');
    const players = ref([]);
    const itemNames = ref({});
    const lastSynced = ref('');
    const playerCount = ref(0);

    onMounted(async () => {
      try {
        const res = await fetch(DATA_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        players.value = data.players || [];
        itemNames.value = data.itemNames || {};
        playerCount.value = data.count || data.players?.length || 0;
        if (data.lastUpdated) lastSynced.value = relativeTime(data.lastUpdated);
      } catch (e) {
        error.value = 'Failed to load player data: ' + e.message;
      } finally {
        loading.value = false;
      }
    });

    return { loading, error, players, itemNames, lastSynced, playerCount };
  },
});
</script>
