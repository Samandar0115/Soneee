/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#b3ccff',
          300: '#84acff',
          400: '#5688ff',
          500: '#2f66ff',
          600: '#1e4af0',
          700: '#1939c4',
          800: '#16329c',
          900: '#162d7a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 6px 24px -8px rgba(15, 23, 42, 0.18)',
      },
    },
  },
  plugins: [],
};
