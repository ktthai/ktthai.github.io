import { ref, watch } from 'vue';

const KEY = 'mabilog.showIds';

/** Shared "show player IDs" preference, remembered in the browser. */
export const showIds = ref(localStorage.getItem(KEY) !== '0');
watch(showIds, (v) => localStorage.setItem(KEY, v ? '1' : '0'));
