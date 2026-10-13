import type { Config } from 'tailwindcss';

// Mobile-first by default (Tailwind's default breakpoints are min-width).
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
