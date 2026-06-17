/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#050403', 900: '#0b0907', 800: '#13100c', 700: '#1c1812', 600: '#2a241a', 500: '#3a3226' },
        gold: { 50: '#fff8e6', 100: '#fdecbf', 200: '#f6d98c', 300: '#edc45a', 400: '#e0ad33', 500: '#c8921b', 600: '#a37412', 700: '#7c570e', 800: '#543c0a', 900: '#2e2105' },
        ember: { 400: '#ff8a3d', 500: '#f2661b' },
        life: { DEFAULT: '#2ecc71', deep: '#27ae60' },
        energy: { DEFAULT: '#f39c12', deep: '#e67e22' },
        pe: { DEFAULT: '#9b59b6', deep: '#8e44ad' }
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        body: ['"Lexend"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(224,173,51,0.25), 0 0 24px rgba(224,173,51,0.15)',
        deep: '0 24px 60px -20px rgba(0,0,0,0.8)'
      },
      backgroundImage: {
        'gold-sheen': 'linear-gradient(135deg,#f6d98c 0%,#c8921b 45%,#7c570e 100%)',
        'ink-fade': 'radial-gradient(120% 100% at 50% 0%,#13100c 0%,#0b0907 60%,#050403 100%)'
      }
    }
  },
  plugins: []
}
