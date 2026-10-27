/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      colors: {
        brand: { 50: '#f3f1ff', 100: '#e9e5ff', 200: '#d4ccff', 300: '#b4a6ff', 400: '#9480ff', 500: '#6d5efc', 600: '#5a46ef', 700: '#4b37d6', 800: '#3e2fad', 900: '#2f2683' },
        ink: { 50: '#f7f7fb', 100: '#efeef6', 200: '#e2e1ee', 300: '#c9c7dc', 400: '#9a98b4', 500: '#6f6c8f', 600: '#4f4c6e', 700: '#353252', 800: '#1f1c3a', 900: '#14112b', 950: '#0c0a1d' },
        mint: { 400: '#5eead4', 500: '#14b8a6' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,17,43,.04), 0 4px 16px rgba(20,17,43,.05)',
        pop: '0 20px 60px rgba(20,17,43,.18)',
      },
    },
  },
  plugins: [],
}
