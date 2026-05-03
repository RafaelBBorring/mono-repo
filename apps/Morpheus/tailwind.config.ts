import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        morpheus: {
          50: '#f8f6ff',
          100: '#f0ebff',
          200: '#e1d7ff',
          300: '#c8b5ff',
          400: '#a882ff',
          500: '#8855ff',
          600: '#7c2ae8',
          700: '#6b1bd1',
          800: '#5814aa',
          900: '#471289',
          950: '#2d0968',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
export default config
