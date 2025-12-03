/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0b0b10',
        foreground: '#f5f5f5',
        accent: '#7c3aed',
        accentSoft: '#7c3aed'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 10px 50px rgba(124, 58, 237, 0.35)'
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
};
