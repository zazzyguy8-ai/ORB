import type { Config } from 'tailwindcss';

/**
 * The design system.
 *
 * Two colour families with strictly separate jobs, and the separation is the
 * whole idea:
 *
 *  - `iris` and `ink` are the *chrome* — background, surfaces, buttons, glows,
 *    brand. A violet-plum world, soft and modern.
 *  - `signal` is *meaning* — green, amber and red belong to BUY, WATCH and
 *    AVOID and appear nowhere else. If the interface decorated itself with
 *    green, a green thing on screen would stop being information.
 *
 * That is why the primary button is violet rather than green: the loudest
 * colour on the page must never compete with the verdict.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Near-black with a violet cast. Warmer and softer than the blue-grey
        // every trading dashboard uses, without going light.
        ink: {
          975: '#07050d',
          950: '#0a0713',
          900: '#0e0b1a',
          850: '#131024',
          800: '#191430',
          700: '#241d43',
          600: '#342a5e',
          500: '#4a3d7d',
        },
        iris: {
          50: '#f4f1ff',
          100: '#e8e2ff',
          200: '#d3c8ff',
          300: '#b7a5fd',
          400: '#9d85f9',
          500: '#8767f0',
          600: '#6f4ede',
          700: '#5a3cbd',
          800: '#432c8c',
          900: '#2c1d5e',
        },
        // Second chrome accent, used only inside gradients so the violet has
        // somewhere to travel to.
        aqua: {
          300: '#7ce7ff',
          400: '#45d7f5',
          500: '#22b8db',
        },
        signal: {
          buy: '#3ceb9f',
          'buy-dim': '#16a86e',
          watch: '#ffc75c',
          'watch-dim': '#c9901f',
          avoid: '#ff6b73',
          'avoid-dim': '#c93a45',
        },
      },
      fontFamily: {
        sans: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.045em',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        // One glow definition per role, so nothing invents its own.
        iris: '0 0 0 1px rgba(135,103,240,0.18), 0 18px 60px -22px rgba(135,103,240,0.55)',
        'iris-lg': '0 0 0 1px rgba(135,103,240,0.24), 0 30px 90px -30px rgba(135,103,240,0.75)',
        lift: '0 24px 60px -32px rgba(0,0,0,0.9)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
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
        // The aurora. Two blobs on different periods so the background never
        // visibly repeats — slow enough to read as light, not as animation.
        //
        // TRANSLATION ONLY, and this is not a style preference. These elements
        // carry a 90px blur; translating an already-blurred layer is a
        // compositor move and costs nothing, but scaling one forces the blur to
        // be recomputed every frame. With `scale` in here the idle page ran at
        // 3.6fps on a throttled laptop. Without it, 60.
        drift: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '33%': { transform: 'translate3d(7%, -5%, 0)' },
          '66%': { transform: 'translate3d(-6%, 6%, 0)' },
        },
        'drift-slow': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(-8%, 7%, 0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
        'sweep': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
      },
      animation: {
        // A single spring-ish curve everywhere: overshoot-free, but it settles
        // rather than stopping, which is what makes motion feel physical.
        'fade-up': 'fade-up 520ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 420ms cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.8s infinite',
        'pulse-soft': 'pulse-soft 1.6s ease-in-out infinite',
        drift: 'drift 26s ease-in-out infinite',
        'drift-slow': 'drift-slow 34s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        'spin-slow': 'spin-slow 26s linear infinite',
        sweep: 'sweep 6s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
