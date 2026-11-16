import { ref, watch, onMounted } from 'vue';

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Animated number that eases toward its source value. */
export function useCountUp(source, { duration = 900, decimals = 0 } = {}) {
  const value = ref(0);
  const factor = 10 ** decimals;
  watch(
    source,
    (to) => {
      if (prefersReducedMotion()) return (value.value = to);
      const from = value.value;
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / duration);
        const eased = 1 - (1 - k) ** 3;
        value.value = Math.round((from + (to - from) * eased) * factor) / factor;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    { immediate: true }
  );
  return value;
}

/** Flips to true one frame after mount so CSS transitions can grow from zero. */
export function useReady() {
  const ready = ref(false);
  onMounted(() => requestAnimationFrame(() => requestAnimationFrame(() => (ready.value = true))));
  return ready;
}

/**
 * Level histogram bins. Each bin sits entirely inside one Players-page level
 * filter bucket, so clicking a bar can open exactly that filter.
 */
export const LEVEL_BINS = [
  { max: 100, label: '<100', bucket: 'lt1k' },
  { max: 300, label: '300', bucket: 'lt1k' },
  { max: 1000, label: '1K', bucket: 'lt1k' },
  { max: 3000, label: '3K', bucket: '1k' },
  { max: 10000, label: '10K', bucket: '1k' },
  { max: 25000, label: '25K', bucket: '10k' },
  { max: 50000, label: '50K', bucket: '10k' },
  { max: 75000, label: '75K', bucket: '50k' },
  { max: 100000, label: '100K', bucket: '50k' },
  { max: 250000, label: '250K', bucket: '100k' },
  { max: 500000, label: '500K', bucket: '100k' },
  { max: 1000000, label: '1M', bucket: '500k' },
  { max: Infinity, label: '1M+', bucket: '500k' },
];

export const levelBinIndex = (lv) => {
  for (let i = 0; i < LEVEL_BINS.length; i++) if ((lv || 0) < LEVEL_BINS[i].max) return i;
  return LEVEL_BINS.length - 1;
};
