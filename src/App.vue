<template>
  <v-app>
    <v-main>
      <v-container fluid>
        <nav class="mb-nav">
          <div class="mb-nav-left">
            <span class="mb-logo" role="button" tabindex="0" @click="go('players')" @keydown.enter="go('players')">MabiLog</span>
            <div class="mb-tabs">
              <button
                v-for="t in TABS"
                :key="t.key"
                class="mb-tab"
                :class="{ on: currentView === t.key }"
                @click="go(t.key)"
              >{{ t.label }}</button>
            </div>
          </div>
          <div v-if="lastSynced" class="mb-sync">
            Synced {{ lastSynced }} · {{ playerCount.toLocaleString() }} players
          </div>
        </nav>

        <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
          {{ error }}
        </v-alert>

        <div v-if="loading" class="d-flex justify-center align-center" style="height: 300px;">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        </div>

        <template v-else-if="players.length > 0">
          <PlayersView v-if="currentView === 'players'" :players="players" :item-names="itemNames" :item-history="itemHistory" :preset="playersPreset" />
          <StatsView v-else-if="currentView === 'stats'" :players="players" :item-names="itemNames" @open-players="openPlayers" />
          <NameChangesView v-else-if="currentView === 'namechanges'" :name-changes="nameChanges" :players="players" @open-players="openPlayers" />
        </template>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import { defineComponent, defineAsyncComponent, ref, shallowRef, onMounted } from 'vue';
import PlayersView from './components/PlayersView.vue';
// Secondary pages load on first visit, so the Players page starts faster
const StatsView = defineAsyncComponent(() => import('./components/StatsView.vue'));
const NameChangesView = defineAsyncComponent(() => import('./components/NameChangesView.vue'));

// VITE_DATA_URL lets a local dev server preview an unpublished players.json
const DATA_URL = import.meta.env.VITE_DATA_URL || 'https://raw.githubusercontent.com/ktthai/ktthai.github.io/main/players.json';
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
    // The data is read-only once loaded, so keep it out of Vue's deep reactivity
    // (deep proxies over ~350k objects cost seconds of CPU and hundreds of MB).
    const players = shallowRef([]);
    const itemNames = shallowRef({});
    const lastSynced = ref('');
    const playerCount = ref(0);
    const nameChanges = shallowRef({});
    const itemHistory = shallowRef({});
    const playersPreset = ref(null);

    // Stats page links: open the Players view with filters (and optionally a search) applied
    const TABS = [
      { key: 'players', label: 'Players' },
      { key: 'stats', label: 'Stats' },
      { key: 'namechanges', label: 'Name Changes' },
    ];
    const go = (view) => {
      playersPreset.value = null;
      currentView.value = view;
    };

    const openPlayers = (preset) => {
      playersPreset.value = { ...preset, at: Date.now() };
      currentView.value = 'players';
      window.scrollTo({ top: 0 });
    };

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
        itemHistory.value = data.itemHistory || {};
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

    return { currentView, loading, error, players, itemNames, itemHistory, lastSynced, playerCount, nameChanges, playersPreset, openPlayers, TABS, go };
  },
});
</script>

<style>
.mb-nav {
  display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  padding: 10px 4px 18px;
}
.mb-nav-left { display: flex; align-items: center; gap: 20px; }
.mb-logo { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.02em; cursor: pointer; color: var(--mb-text); }
.mb-tabs { display: flex; gap: 4px; padding: 3px; border-radius: 10px; background: rgba(148, 163, 184, 0.05); }
.mb-tab {
  height: 30px; padding: 0 14px; border-radius: 8px; border: 0; background: transparent; cursor: pointer;
  font: inherit; font-size: 0.85rem; font-weight: 500; color: var(--mb-text-2); transition: all 0.15s;
}
.mb-tab:hover { color: var(--mb-text); }
.mb-tab.on { background: var(--mb-surface-2); color: var(--mb-text); box-shadow: 0 1px 0 rgba(148, 163, 184, 0.08) inset; }
.mb-sync { font-size: 0.78rem; color: var(--mb-text-3); font-variant-numeric: tabular-nums; }
</style>
