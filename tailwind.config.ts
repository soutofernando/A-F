import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--texto)',
        bone: 'var(--bg-alt)',
        cream: 'var(--bg)',
        paper: 'var(--paper)',
        gold: 'var(--gold)',
        'ink-blue': 'var(--ink-blue)',
        terracotta: 'var(--terracotta)',
        'leaf-green': 'var(--leaf-green)',
        oak: 'var(--oak)',
        walnut: 'var(--walnut)',
        'petal-white': 'var(--petal-white)',
        'gold-soft': 'var(--dourado-esc)',
        muted: 'var(--texto-suave)',
        discreet: 'var(--texto-discreto)',
        bg: 'var(--bg)',
        'azul-profundo': 'var(--azul-profundo)',
        'btn-primary': 'var(--btn-primary)',
        'btn-secondary': 'var(--btn-secondary)',
        terracota: 'var(--terracota-cta)',
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
