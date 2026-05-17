/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ocean: {
          light: '#E8F4F8',
          50: '#F0F9FB',
          100: '#E1F2F6',
          200: '#C3E5ED',
          300: '#9DCFDB',
          400: '#6FB3C4',
          500: '#4A9AAD',
          600: '#35808F',
          700: '#2D6673',
          800: '#27545C',
          900: '#24464D',
          DEFAULT: '#4A9AAD',
          deep: '#1E3A42',
        },
        coral: {
          light: '#FFE8E4',
          DEFAULT: '#FF6B6B',
          deep: '#E84545',
        },
        sand: {
          light: '#FDFCF9',
          DEFAULT: '#F5F0E8',
          dark: '#E8E0D4',
        },
        night: {
          800: '#1A1A2E',
          700: '#252542',
          600: '#333357',
        },
        accent: '#FFD93D',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Outfit"', 'system-ui', 'sans-serif'],
        mono: ['"DM Code"', 'monospace'],
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-in': 'slideIn 0.3s ease-out forwards',
        'bounce-dot': 'bounceDot 1.2s infinite ease-in-out',
        'pulse-glow': 'pulseGlow 2s infinite ease-in-out',
        'quote-cycle': 'quoteCycle 0.6s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        bounceDot: {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(74, 154, 173, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(74, 154, 173, 0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}