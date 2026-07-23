/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        easydry: {
          blue: {
            DEFAULT: '#07558C',
            dark: '#053F67',
            deep: '#042D4B',
            light: '#0A70B8',
            hover: '#0863A3',
            50: '#F0F7FC',
            100: '#E0F0FA',
            500: '#07558C',
            600: '#053F67',
            900: '#032138',
          },
          green: {
            DEFAULT: '#9BCB3B',
            dark: '#7EA82B',
            light: '#B2E040',
            accent: '#A5DB36',
            50: '#F6FBF0',
            100: '#EDF7DB',
            500: '#9BCB3B',
            600: '#7EA82B',
          },
          lime: '#B2E040',
          bg: '#F8FAFC',
          card: '#FFFFFF',
          slate: {
            50: '#F8FAFC',
            100: '#F1F5F9',
            200: '#E2E8F0',
            300: '#CBD5E1',
            400: '#94A3B8',
            500: '#64748B',
            600: '#475569',
            700: '#334155',
            800: '#1E293B',
            900: '#0F172A',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'easydry': '0 4px 20px -2px rgba(7, 85, 140, 0.08), 0 2px 6px -1px rgba(7, 85, 140, 0.04)',
        'easydry-hover': '0 10px 25px -3px rgba(7, 85, 140, 0.12), 0 4px 10px -2px rgba(155, 203, 59, 0.15)',
        'glow-green': '0 0 15px rgba(155, 203, 59, 0.4)',
        'glow-blue': '0 0 15px rgba(7, 85, 140, 0.3)',
      }
    },
  },
  plugins: [],
}
