/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm paper, deep evergreen, and ink: a grounded civic field-guide palette.
        canvas: '#F5F4EF',
        ink: { DEFAULT: '#202D2A', soft: '#4F615B', muted: '#78847E' },
        brand: {
          50: '#EEF5F0', 100: '#DCEAE0', 200: '#BDD7C6', 300: '#91BDA0',
          400: '#5E9978', 500: '#267052', 600: '#1D5D43', 700: '#194B38',
          800: '#173D30', 900: '#142F27',
        },
        line: { DEFAULT: '#D8DCD3', soft: '#E7E8E1' },
        hazard: {
          tornado: '#B3261E', flood: '#1565C0', thunder: '#C76B14',
          winter: '#5A6B7A', general: '#6B7280',
        },
        severity: {
          extreme: '#7A1212', severe: '#B3261E', moderate: '#A95C13',
          minor: '#5A6B7A', unknown: '#6B7280',
        },
      },
      fontFamily: { sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      boxShadow: {
        panel: '0 1px 2px rgba(32, 45, 42, 0.035)',
        elevated: '0 8px 24px -12px rgba(32, 45, 42, 0.22), 0 2px 6px -3px rgba(32, 45, 42, 0.10)',
      },
      borderRadius: { panel: '8px' },
      maxWidth: { layout: '1440px' },
    },
  },
  plugins: [],
};
