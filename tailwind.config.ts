import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        orb: {
          black: '#000000',
          violet: '#7B2FBE',
          deep: '#4A0E8F',
          text: '#E8E8E8',
          accent: '#C084FC',
          danger: '#DC2626',
        },
        // CULTSCAN: a terminal palette. Deliberately separate from the orb
        // colours so the two products can diverge without stepping on each other.
        cs: {
          bg: '#07090A',
          panel: '#0D1113',
          line: '#1C2427',
          text: '#D6E0DC',
          dim: '#7B8B86',
          green: '#3DFF9E',
          amber: '#FFB03A',
          red: '#FF4D4D',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 20s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px #7B2FBE, 0 0 40px #4A0E8F' },
          '100%': { boxShadow: '0 0 40px #C084FC, 0 0 80px #7B2FBE' },
        },
      },
    },
  },
  plugins: [],
}
export default config
