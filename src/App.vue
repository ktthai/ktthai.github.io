<template>
  <v-app>
    <v-main>
      <v-container fluid>
        <v-row justify="center" class="mb-2 mt-2">
          <v-col cols="12">
            <div class="d-flex align-center justify-space-between px-2">
              <div class="d-flex align-center" style="gap: 8px;">
                <span
                  class="text-h5 font-weight-bold"
                  style="cursor: pointer;"
                  @click="currentView = 'players'"
                >MabiLog</span>
                <v-btn
                  variant="text"
                  size="small"
                  :color="currentView === 'stats' ? 'primary' : 'grey'"
                  @click="currentView = 'stats'"
                >Stats</v-btn>
                <v-btn
                  variant="text"
                  size="small"
                  :color="currentView === 'namechanges' ? 'primary' : 'grey'"
                  @click="currentView = 'namechanges'"
                >Name Changes</v-btn>
              </div>
              <div v-if="lastSynced" class="text-caption text-grey text-right">
                Last synced: {{ lastSynced }} &nbsp;·&nbsp; {{ playerCount }} players
              </div>
            </div>
          </v-col>
        </v-row>

        <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
          {{ error }}
        </v-alert>

        <div v-if="loading" class="d-flex justify-center align-center" style="height: 300px;">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        </div>

        <template v-else-if="players.length > 0">
          <PlayersView v-if="currentView === 'players'" :players="players" :item-names="itemNames" />
          <StatsView v-else-if="currentView === 'stats'" :players="players" />
          <NameChangesView v-else-if="currentView === 'namechanges'" :name-changes="nameChanges" />
        </template>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import { defineComponent, ref, onMounted } from 'vue';
import PlayersView from './components/PlayersView.vue';
import StatsView from './components/StatsView.vue';
import NameChangesView from './components/NameChangesView.vue';

const DATA_URL = 'https://raw.githubusercontent.com/ktthai/ktthai.github.io/main/players.json';
const NAME_CHANGES_URL = 'https://raw.githubusercontent.com/ktthai/ktthai.github.io/main/name_changes.json';

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
  components: { PlayersView, StatsView, NameChangesView },
  setup() {
    const currentView = ref('players');
    const loading = ref(true);
    const error = ref('');
    const players = ref([]);
    const itemNames = ref({});
    const lastSynced = ref('');
    const playerCount = ref(0);
    const nameChanges = ref({});

    onMounted(async () => {
      try {
        const [playersRes, nameChangesRes] = await Promise.all([
          fetch(DATA_URL),
          fetch(NAME_CHANGES_URL),
        ]);
        if (!playersRes.ok) throw new Error(`HTTP ${playersRes.status}`);
        const data = await playersRes.json();

        players.value = data.players || [];
        itemNames.value = data.itemNames || {};
        playerCount.value = data.count || data.players?.length || 0;
        if (data.lastUpdated) lastSynced.value = relativeTime(data.lastUpdated);

        if (nameChangesRes.ok) {
          nameChanges.value = await nameChangesRes.json();
        }
      } catch (e) {
        error.value = 'Failed to load player data: ' + e.message;
      } finally {
        loading.value = false;
      }
    });

    return { currentView, loading, error, players, itemNames, lastSynced, playerCount, nameChanges };
  },
});
</script>
