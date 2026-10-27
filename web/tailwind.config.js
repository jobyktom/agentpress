/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Signal orange accent on warm paper neutrals.
        brand: { 50: '#fff4ec', 100: '#ffe6d3', 200: '#ffcaa4', 300: '#ffa76c', 400: '#f9853d', 500: '#ee661b', 600: '#d6540e', 700: '#b2430e', 800: '#8e3712', 900: '#732f12' },
        ink: { 50: '#f8f6f2', 100: '#f0ece5', 200: '#e4dfd6', 300: '#cfc8bc', 400: '#a29c91', 500: '#76716a', 600: '#58544e', 700: '#3e3b36', 800: '#272522', 900: '#181715', 950: '#100f0e' },
        paper: '#f2efe9',
        surface: '#fbfaf7',
      },
      letterSpacing: { tightest: '-0.045em' },
      boxShadow: {
        card: 'inset 0 1px 0 rgba(255,255,255,.9), 0 1px 2px rgba(24,23,21,.04), 0 10px 24px -14px rgba(24,23,21,.16)',
        lift: 'inset 0 1px 0 rgba(255,255,255,.9), 0 2px 4px rgba(24,23,21,.05), 0 24px 48px -20px rgba(24,23,21,.28)',
        pop: '0 2px 6px rgba(24,23,21,.06), 0 30px 60px -20px rgba(24,23,21,.3)',
        btn: 'inset 0 1px 0 rgba(255,255,255,.25), 0 1px 2px rgba(24,23,21,.12), 0 6px 14px -6px rgba(238,102,27,.55)',
      },
    },
  },
  plugins: [],
}
