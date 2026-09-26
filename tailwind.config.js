/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef4ff',
          100: '#dce7fd',
          200: '#c3d5fc',
          300: '#9bb8fa',
          400: '#6a8ff7',
          500: '#3f66f0',
          600: '#2447e0',
          700: '#1d39b4',
          800: '#1e3291',
          900: '#1f2f5e',
        },
        sunny: {
          DEFAULT: '#ffc929',
          soft: '#ffe9a8',
        },
        cobalt: {
          DEFAULT: '#2447e0',
          dark: '#1d39b4',
        },
        bubblegum: {
          DEFAULT: '#f7739d',
          soft: '#ffd3e2',
        },
        cream: {
          DEFAULT: '#fff7e0',
          dark: '#f5f2ee',
        },
        ink: {
          DEFAULT: '#161d38',
          soft: '#3c4568',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Nunito', 'sans-serif'],
      },
      boxShadow: {
        card: '4px 4px 0 0 #161d38',
        'card-hover': '6px 6px 0 0 #161d38',
        pop: '2px 2px 0 0 #161d38',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
}
