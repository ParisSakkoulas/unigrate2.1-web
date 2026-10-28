/** @type {import('tailwindcss').Config} */
const primeui = require('tailwindcss-primeui');

module.exports = {
  darkMode: 'none',
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e5ff',
          500: '#3b6fe0',
          600: '#2b59c3',
          700: '#2347a0',
          900: '#14295e',
        },
      },
    },
  },
  plugins: [primeui],
};
