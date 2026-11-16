<template>
  <section class="fg">
    <div class="fg-head" role="button" tabindex="0" @click="open = !open" @keydown.enter="open = !open">
      <v-icon v-if="icon" size="16" class="fg-icon">{{ icon }}</v-icon>
      <span class="fg-title">{{ title }}</span>
      <span v-if="selected.length" class="fg-badge">{{ selected.length }}</span>
      <span class="fg-spacer" />
      <button v-if="selected.length" class="fg-clear" @click.stop="emit([])">Clear</button>
      <v-icon size="18" class="fg-chev" :class="{ closed: !open }">mdi-chevron-down</v-icon>
    </div>

    <div v-show="open" class="fg-body">
      <slot name="before" />
      <div
        v-for="o in options"
        :key="o.key"
        class="fg-row"
        :class="{ on: isOn(o.key), empty: !o.count && !isOn(o.key), radio: single }"
        role="checkbox"
        :aria-checked="isOn(o.key)"
        tabindex="0"
        @click="toggle(o.key)"
        @keydown.space.prevent="toggle(o.key)"
      >
        <span class="fg-bar" :style="{ width: barWidth(o.count) }" />
        <span class="fg-box"><v-icon v-if="isOn(o.key)" size="12">mdi-check-bold</v-icon></span>
        <img v-if="o.img" :src="o.img" class="fg-img" alt="" />
        <span v-else-if="o.color" class="fg-dot" :style="{ background: o.color }" />
        <span class="fg-label">{{ o.label }}</span>
        <button v-if="!single && options.length > 2" class="fg-only" @click.stop="emit([o.key])">only</button>
        <span class="fg-count">{{ (o.count || 0).toLocaleString() }}</span>
      </div>
      <slot name="after" />
    </div>
  </section>
</template>

<script>
import { defineComponent, ref, computed } from 'vue';

export default defineComponent({
  name: 'FacetGroup',
  props: {
    title: { type: String, required: true },
    icon: { type: String, default: '' },
    options: { type: Array, required: true }, // [{ key, label, count, color?, img? }]
    selected: { type: Array, required: true },
    single: { type: Boolean, default: false },
    startOpen: { type: Boolean, default: true },
  },
  emits: ['update:selected'],
  setup(props, { emit: rawEmit }) {
    const open = ref(props.startOpen);
    const emit = (v) => rawEmit('update:selected', v);
    const isOn = (k) => props.selected.includes(k);
    const toggle = (k) => {
      if (props.single) return emit(isOn(k) ? [] : [k]);
      emit(isOn(k) ? props.selected.filter((x) => x !== k) : [...props.selected, k]);
    };
    const max = computed(() => Math.max(1, ...props.options.map((o) => o.count || 0)));
    const barWidth = (c) => `${((c || 0) / max.value) * 100}%`;
    return { open, emit, isOn, toggle, barWidth };
  },
});
</script>

<style scoped>
.fg { padding: 4px 0 10px; border-bottom: 1px solid rgba(148, 163, 184, 0.06); }
.fg:last-child { border-bottom: none; }
.fg-head {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 4px; cursor: pointer; user-select: none;
  font-size: 0.72rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--mb-text-2);
}
.fg-head:hover { color: var(--mb-text); }
.fg-icon { opacity: 0.7; }
.fg-badge {
  background: var(--mb-accent); color: var(--mb-on-accent); font-weight: 700;
  border-radius: 999px; padding: 0 7px; font-size: 0.65rem; line-height: 16px; letter-spacing: 0;
}
.fg-spacer { flex: 1; }
.fg-clear {
  font-size: 0.7rem; text-transform: none; letter-spacing: 0; font-weight: 500;
  color: var(--mb-accent); background: none; border: 0; cursor: pointer;
}
.fg-chev { transition: transform 0.2s; }
.fg-chev.closed { transform: rotate(-90deg); }

.fg-body { display: flex; flex-direction: column; gap: 2px; }
.fg-row {
  position: relative; display: flex; align-items: center; gap: 10px;
  padding: 6px 8px; border-radius: 8px; cursor: pointer; overflow: hidden;
  font-size: 0.85rem; color: var(--mb-text);
  transition: background 0.15s, color 0.15s, opacity 0.15s;
}
.fg-row:hover { background: rgba(148, 163, 184, 0.05); }
.fg-row:focus-visible { outline: 2px solid rgba(var(--mb-accent-rgb), 0.6); outline-offset: -2px; }
.fg-row.on { color: var(--mb-text); background: rgba(var(--mb-accent-rgb), 0.1); }
.fg-row.empty { opacity: 0.38; }

.fg-bar {
  position: absolute; left: 0; bottom: 0; height: 2px;
  background: rgba(var(--mb-accent-rgb), 0.28); border-radius: 2px;
  transition: width 0.3s ease; pointer-events: none;
}
.fg-box {
  flex: none; width: 16px; height: 16px; border-radius: 5px;
  border: 1.5px solid rgba(148, 163, 184, 0.3);
  display: grid; place-items: center; transition: all 0.15s; color: var(--mb-text);
}
.fg-row.radio .fg-box { border-radius: 50%; }
.fg-row.on .fg-box { background: var(--mb-accent); border-color: var(--mb-accent); color: var(--mb-on-accent); }
.fg-dot { flex: none; width: 8px; height: 8px; border-radius: 50%; }
.fg-img { flex: none; width: 20px; height: 20px; object-fit: contain; }
.fg-label { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fg-count { font-variant-numeric: tabular-nums; font-size: 0.75rem; color: var(--mb-text-3); }
.fg-only {
  display: none; font-size: 0.68rem; padding: 1px 6px; border-radius: 4px; cursor: pointer;
  background: rgba(148, 163, 184, 0.08); color: var(--mb-text-2); border: 0;
}
.fg-row:hover .fg-only { display: inline-block; }
.fg-only:hover { background: rgba(var(--mb-accent-rgb), 0.3); color: var(--mb-text); }
</style>
