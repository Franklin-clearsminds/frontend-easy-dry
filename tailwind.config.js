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
            DEFAULT: '#004282',
            dark: '#003A7C',
            deep: '#002952',
            light: '#36699B',
            hover: '#003F7A',
            50: '#E8F1F8',
            100: '#D4E4F2',
            500: '#004282',
            600: '#003A7C',
            900: '#001A33',
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
          // Verde para TEXTO sobre fondos claros (6,3:1 sobre el verde tintado). easydry-green-dark solo para fondos.
          'green-text': '#3F6212',
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
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'easydry': '0 4px 20px -2px rgba(0, 66, 130, 0.08), 0 2px 6px -1px rgba(0, 66, 130, 0.04)',
        'easydry-hover': '0 10px 25px -3px rgba(0, 66, 130, 0.12), 0 4px 10px -2px rgba(155, 203, 59, 0.15)',
        'glow-green': '0 0 15px rgba(155, 203, 59, 0.4)',
        'glow-blue': '0 0 15px rgba(0, 66, 130, 0.3)',
        // Nombres de Tailwind v4 que el proyecto ya usa (~150 veces) y en v3 no existían: se definen para que apliquen.
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        '2xs': '0 1px 1px 0 rgb(0 0 0 / 0.04)',
      },
      dropShadow: {
        'xs': '0 1px 1px rgb(0 0 0 / 0.05)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-4px)' },
          '40%, 80%': { transform: 'translateX(4px)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        shake: 'shake 0.4s ease-in-out',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
}
