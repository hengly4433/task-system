// @ts-ignore
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#f1184c',      // Brand red/pink for main actions
          secondary: '#ff6b8a',    // Lighter pink accent
          accent: '#06B6D4',       // Cyan for highlights
          error: '#EF4444',
          warning: '#F59E0B',
          info: '#3B82F6',
          success: '#10B981',
          background: '#F8FAFC',
          surface: '#FFFFFF',
          'on-background': '#1E293B',
          'on-surface': '#334155',
        },
      },
      dark: {
        colors: {
          primary: '#ff6b8a',
          secondary: '#f1184c',
          accent: '#22D3EE',
          error: '#F87171',
          warning: '#FBBF24',
          info: '#60A5FA',
          success: '#34D399',
          background: '#0F172A',
          surface: '#1E293B',
        },
      },
    },
  },
  defaults: {
    VBtn: {
      rounded: 'lg',
      elevation: 0,
    },
    VCard: {
      rounded: 'lg',
      elevation: 0,
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
    },
  },
})

export default vuetify
