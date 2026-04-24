import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        bone: 'var(--bone)',
        cream: 'var(--cream)',
        paper: 'var(--paper)',
        gold: 'var(--gold)',
        'gold-soft': 'var(--gold-soft)',
        muted: 'var(--muted)',
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Cormorant Garamond', 'serif'],
        italic: ['var(--font-italiana)', 'Italiana', 'serif'],
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
