/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Legacy tokens (updated to Archivist Codex palette)
        void: '#0e0e0f',
        deep: '#1c1b1c',
        panel: '#201f20',
        gold: '#f7bd48',
        'gold-light': '#ffdea6',
        'txt-main': '#e5e2e3',
        'txt-dim': '#9c8f7b',
        err: '#ffb4ab',
        ok: '#4ade80',
        warn: '#ff9100',
        sep: '#353436',

        // Archivist Codex — Primary (Gold)
        primary: '#f7bd48',
        'primary-fixed': '#ffdea6',
        'primary-fixed-dim': '#f7bd48',
        'primary-container': '#ba880f',
        'on-primary': '#412d00',
        'on-primary-fixed': '#271900',
        'on-primary-fixed-variant': '#5d4200',
        'on-primary-container': '#392700',
        'inverse-primary': '#7b5800',

        // Archivist Codex — Secondary (Cyan)
        secondary: '#bdf4ff',
        'secondary-fixed': '#9cf0ff',
        'secondary-fixed-dim': '#00daf3',
        'secondary-container': '#00e3fd',
        'on-secondary': '#00363d',
        'on-secondary-fixed': '#001f24',
        'on-secondary-fixed-variant': '#004f58',
        'on-secondary-container': '#00616d',

        // Archivist Codex — Tertiary (Blue-Gray)
        tertiary: '#b8c8da',
        'tertiary-fixed': '#d4e4f6',
        'tertiary-fixed-dim': '#b8c8da',
        'tertiary-container': '#8292a3',
        'on-tertiary': '#223240',
        'on-tertiary-fixed': '#0d1d2a',
        'on-tertiary-fixed-variant': '#394857',
        'on-tertiary-container': '#1c2b39',

        // Archivist Codex — Surfaces
        background: '#0e0e0f',
        'on-background': '#e5e2e3',
        surface: '#131314',
        'surface-dim': '#131314',
        'surface-bright': '#3a393a',
        'surface-tint': '#f7bd48',
        'surface-variant': '#353436',
        'surface-container-lowest': '#0e0e0f',
        'surface-container-low': '#1c1b1c',
        'surface-container': '#18181b',
        'surface-container-high': '#2a2a2b',
        'surface-container-highest': '#353436',
        'on-surface': '#e5e2e3',
        'on-surface-variant': '#d3c4af',
        'inverse-surface': '#e5e2e3',
        'inverse-on-surface': '#313031',

        // Archivist Codex — Outlines & Errors
        outline: '#9c8f7b',
        'outline-variant': '#4f4535',
        error: '#ffb4ab',
        'error-container': '#93000a',
        'on-error': '#690005',
        'on-error-container': '#ffdad6',

        // Archivist Codex — Resources
        'resource-vida': '#4ade80',
        'resource-energia': '#f7bd48',
        'resource-pe': '#60a5fa',
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        body: ['Newsreader', 'serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
        'stat-display': ['JetBrains Mono', 'monospace'],
        'body-md': ['Newsreader', 'serif'],
        'technical-sm': ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'stat-display': ['24px', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '500' }],
        'body-md': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'heading-2': ['32px', { lineHeight: '1.3', fontWeight: '600' }],
        'technical-sm': ['12px', { lineHeight: '1.4', fontWeight: '400' }],
        'heading-1': ['48px', { lineHeight: '1.2', letterSpacing: '0.05em', fontWeight: '700' }],
      },
    },
  },
  plugins: [],
}
