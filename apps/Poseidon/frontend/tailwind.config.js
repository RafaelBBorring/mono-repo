/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      colors: {
        ocean:  '#0EA5E9',
        foam:   '#BAE6FD',
        reef:   '#0F172A',
        coral:  '#F43F5E',
        kelp:   '#10B981',
        sunset: '#F59E0B',
      },
    },
  },
  plugins: [],
}
