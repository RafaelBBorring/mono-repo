/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: '#0f0f1a',
        deep: '#1a1a2e',
        panel: '#16213e',
        gold: '#c9a84c',
        'gold-light': '#e8c97e',
        'txt-main': '#e8e8f0',
        'txt-dim': '#8888aa',
        'err': '#e05252',
        'ok': '#52c278',
        'warn': '#e0a030',
        sep: '#2a2a4a',
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
