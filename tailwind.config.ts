import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      borderColor: { DEFAULT: 'hsl(var(--border))' },
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        surface: { DEFAULT: 'hsl(var(--surface))', hover: 'hsl(var(--surface-hover))' },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          hover: 'hsl(var(--primary-hover))',
        },
        muted: { DEFAULT: 'hsl(var(--body))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent-fill))' },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
