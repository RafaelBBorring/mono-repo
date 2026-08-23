/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#080b14',
          900: '#0b0f1a',
          850: '#0f1422',
          800: '#141a2a',
          700: '#1c2336',
          600: '#272f45',
          500: '#3a4258'
        },
        mint: {
          DEFAULT: '#3ddc97',
          light: '#7af0bd',
          dark: '#1fa974'
        },
        sky: {
          DEFAULT: '#5b9eff',
          light: '#9bc4ff'
        },
        amber2: '#f59e0b',
        rose2: '#ef4444',
        ivory: '#e6e9f2',
        dusk: '#7a8499'
      },
      fontFamily: {
        display: ['var(--font-sora)', 'Inter', 'system-ui', 'sans-serif'],
        body: ['var(--font-sora)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace']
      },
      boxShadow: {
        card: '0 8px 32px -16px rgba(0,0,0,0.6)'
      },
      keyframes: {
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
        pulse: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } }
      },
      animation: {
        floaty: 'floaty 5s ease-in-out infinite',
        pulse: 'pulse 2s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite'
      }
    }
  },
  plugins: []
};
