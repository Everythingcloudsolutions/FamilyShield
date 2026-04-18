/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    fontFamily: {
      sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      display: ['var(--font-display)', 'system-ui', 'sans-serif'],
    },
    extend: {
      colors: {
        // Primary accent: warm orange/amber for safety & protection
        accent: {
          50: '#fef2e8',
          100: '#fee6d5',
          200: '#fcc8a8',
          300: '#faa976',
          400: '#f97316', // primary
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#92300a',
          900: '#78210a',
        },
        // Surface colors: refined dark palette
        surface: {
          0: '#050505',
          50: '#0f0f0f',
          100: '#1c1c1e',
          150: '#2a2a2d',
          200: '#3a3a3f',
          300: '#4a4a52',
        },
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
      },
      boxShadow: {
        'sm-glass': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'md-glass': '0 10px 15px -3px rgba(0, 0, 0, 0.15)',
        'lg-glass': '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        'glow-accent': '0 0 20px rgba(249, 115, 22, 0.2)',
      },
    },
  },
  plugins: [
    function ({ addBase }) {
      addBase({
        ':root': {
          '--font-sans': '"IBM Plex Sans", system-ui, sans-serif',
          '--font-display': '"Bricolage Grotesque", system-ui, sans-serif',
        },
      })
    },
  ],
}
