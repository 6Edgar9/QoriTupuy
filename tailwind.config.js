/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fbf8ea',
          100: '#f5eecc',
          200: '#ebdb99',
          300: '#dec35f',
          400: '#d2ab2f',
          500: '#b8901f', // Qori (Dorado Andino)
          600: '#9b7117',
          700: '#7c5316',
          800: '#674418',
          900: '#583918',
        },
      },
    },
  },
  plugins: [],
};

