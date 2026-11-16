import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The MDI stylesheet defines ~7,400 icons (~450 KB). This keeps only the icons
 * actually referenced in src/ plus the ones Vuetify uses internally, so new
 * icons work automatically as long as they're written out as "mdi-name".
 */
function mdiSubset() {
  const ICON_RE = /mdi-[a-z0-9]+(?:-[a-z0-9]+)*/g;
  const collect = () => {
    const used = new Set();
    const walk = (dir) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(vue|js|ts)$/.test(f)) for (const m of readFileSync(p, 'utf8').matchAll(ICON_RE)) used.add(m[0]);
      }
    };
    walk('src');
    for (const m of readFileSync('node_modules/vuetify/lib/iconsets/mdi.js', 'utf8').matchAll(ICON_RE)) used.add(m[0]);
    return used;
  };
  return {
    name: 'mdi-subset',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').includes('@mdi/font/css/materialdesignicons')) return null;
      const used = collect();
      return {
        code: code.replace(/\.(mdi-[a-z0-9-]+)::before\s*\{[^}]*\}\s*/g, (rule, name) => (used.has(name) ? rule : '')),
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [mdiSubset(), vue()],
  build: {
    rollupOptions: {
      output: {
        // Framework code changes rarely; a separate chunk stays cached across deploys
        manualChunks: (id) => (id.includes('node_modules') && !id.endsWith('.css') ? 'vendor' : undefined),
      },
    },
  },
});
