/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf8fb',
          100: '#f0edf3',
          200: '#e0dbe7',
          300: '#c7bfd5',
          400: '#a397bb',
          500: '#71639e',
          600: '#714B67',
          700: '#5f3f57',
          800: '#4c3245',
          900: '#392634',
        },
        odooTeal: '#017e84',
        odooTealHover: '#006e74',
        odooDark: '#212529',
        odooLightBg: '#f9f9f9',
        odooBorder: '#dee2e6',
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}