/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      colors: {
        // Brand green — primary accent (muted, sophisticated green)
        brand: {
          50: '#EAFBF3',
          100: '#D5F5E3',
          200: '#BFEBD6',
          300: '#68C591',
          400: '#51A175',
          500: '#368159',
          600: '#1D623F',
          700: '#165232',
          800: '#0F3D24',
          900: '#082818',
        },
        // Surface neutrals — backgrounds, text, borders
        surface: {
          50: '#FBFCFE',
          100: '#DFE2E7',
          200: '#E8EBF0',
          300: '#C5CAD1',
          400: '#A4A8B1',
          500: '#6E7580',
          550: '#3A404E',
          600: '#3A4557',
          700: '#2B3645',
          800: '#1C2838',
          825: '#151D2E',
          850: '#131B2B',
          900: '#0C121E',
          925: '#0B0F1A',
          950: '#0A0E18',
        },
        // Teal — info semantic, user role tag
        teal: {
          200: '#CDECF3',
          300: '#A8D8E4',
          400: '#4A96A8',
          500: '#2F7C8E',
          600: '#23606E',
        },
        // Amber — warning semantic (overrides default)
        amber: {
          200: '#F3E0C2',
          300: '#E4C99A',
          400: '#B88540',
          500: '#9A6B2E',
          600: '#7A5424',
        },
        // Rose — danger/error semantic (overrides default)
        rose: {
          200: '#F2CDD7',
          300: '#D4A1B1',
          400: '#B57080',
          500: '#8E4252',
          600: '#6E3340',
        },
        // Mauve — admin role tag
        mauve: {
          200: '#E7D3DF',
          300: '#D4B5C8',
          400: '#9A6A8C',
          500: '#6F4A67',
          600: '#563A50',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in-down': 'fadeInDown 0.3s ease-out',
        'fade-out': 'fadeOut 0.25s ease-in forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-out': 'scaleOut 0.2s ease-in forwards',
        'toast-in': 'toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'toast-out': 'toastOut 0.25s ease-in forwards',
        'progress-shimmer': 'progressShimmer 2s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        scaleOut: {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },
        toastIn: {
          '0%': { opacity: '0', transform: 'translateY(-8px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        toastOut: {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-8px) scale(0.95)' },
        },
        progressShimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(54, 129, 89, 0.2), 0 0 20px rgba(54, 129, 89, 0.1)' },
          '100%': { boxShadow: '0 0 10px rgba(54, 129, 89, 0.3), 0 0 40px rgba(54, 129, 89, 0.15)' },
        },
      },
    },
  },
  plugins: [],
}
