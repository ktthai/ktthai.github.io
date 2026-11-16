import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
// Register only the Vuetify components the app uses (keeps the bundle small)
import {
  VAlert, VApp, VAutocomplete, VContainer, VDataTableServer, VDialog, VIcon, VMain, VMenu,
  VProgressCircular, VTooltip,
} from 'vuetify/components';
import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';
import './styles/theme.css';
import App from './App.vue';

const vuetify = createVuetify({
  components: {
    VAlert, VApp, VAutocomplete, VContainer, VDataTableServer, VDialog, VIcon, VMain, VMenu,
    VProgressCircular, VTooltip,
  },
  theme: {
    defaultTheme: 'mabi',
    themes: {
      mabi: {
        dark: true,
        colors: {
          background: '#0f1218',
          surface: '#151922',
          'surface-variant': '#1b202b',
          'on-surface-variant': '#e3e7ef',
          primary: '#8b9cf6',
          'on-primary': '#0f1218',
          secondary: '#94a3b8',
          error: '#f28b82',
          success: '#81c995',
          warning: '#f6c177',
          info: '#7dc4e4',
          'on-background': '#e3e7ef',
          'on-surface': '#e3e7ef',
        },
      },
    },
  },
});

createApp(App).use(vuetify).mount('#app');
