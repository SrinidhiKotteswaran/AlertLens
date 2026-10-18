/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Civic baby-blue palette
        canvas: '#EFF7FC',
        ink: {
          DEFAULT: '#16324F',
          soft: '#3D5A75',
          muted: '#6B819A',
        },
        brand: {
          50: '#EEF6FC',
          100: '#D7EAF6',
          200: '#B6D7EE',
          300: '#88BCE0',
          400: '#5A9FCE',
          500: '#377DB5',
          600: '#2A6499',
          700: '#234F7B',
          800: '#1E3F63',
          900: '#16324F',
        },
        line: {
          DEFAULT: '#C9DCEA',
          soft: '#DCE8F1',
        },
        // Hazard categories (used only for indicators/polygons/timelines/icons)
        hazard: {
          tornado: '#B3261E',
          flood: '#1565C0',
          thunder: '#E07B00',
          winter: '#5A6B7A',
          general: '#6B7280',
        },
        severity: {
          extreme: '#7A1212',
          severe: '#B3261E',
          moderate: '#C4661F',
          minor: '#5A6B7A',
          unknown: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(22, 50, 79, 0.06), 0 1px 1px rgba(22, 50, 79, 0.04)',
        elevated: '0 6px 18px -6px rgba(22, 50, 79, 0.18), 0 2px 6px -2px rgba(22, 50, 79, 0.10)',
      },
      borderRadius: {
        panel: '12px',
      },
      maxWidth: {
        layout: '1440px',
      },
    },
  },
  plugins: [],
};
