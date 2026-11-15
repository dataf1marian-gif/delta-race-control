import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';
import { palette } from './lib/theme';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: palette,
      fontFamily: {
        display: ['var(--font-chakra)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      maxWidth: { app: '520px', 'app-md': '760px', 'app-lg': '1180px' },
      keyframes: {
        pulseDot: {
          '0%': { boxShadow: '0 0 0 0 rgba(255,30,60,.6)' },
          '70%': { boxShadow: '0 0 0 7px rgba(255,30,60,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(255,30,60,0)' },
        },
        tsflash: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.5' } },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'pulse-dot': 'pulseDot 1.4s infinite',
        'flash-slow': 'tsflash 1.1s infinite',
        flash: 'tsflash 1s infinite',
        'flash-fast': 'tsflash .65s infinite',
        'fade-up': 'fadeUp .3s ease',
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        ':root': Object.fromEntries(Object.entries(palette).map(([k, v]) => [`--${k}`, v])),
      });
    }),
  ],
};

export default config;
