import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Near-black with a blue cast rather than pure grey — reads as a
        // instrument panel instead of a text editor.
        ink: {
          950: '#06070a',
          900: '#0a0c11',
          850: '#0e1117',
          800: '#131722',
          700: '#1c2130',
          600: '#2a3143',
          500: '#3d465c',
        },
        signal: {
          buy: '#2ee88a',
          'buy-dim': '#12a862',
          watch: '#ffc043',
          'watch-dim': '#c48a12',
          avoid: '#ff5a52',
          'avoid-dim': '#c02f28',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Inter', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.045em',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 400ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 350ms cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.8s infinite',
        'pulse-soft': 'pulse-soft 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
