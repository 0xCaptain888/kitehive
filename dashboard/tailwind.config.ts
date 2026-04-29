import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#F59E0B',
        background: '#0A0E17',
        surface: '#111827',
        'surface-light': '#1F2937',
        accent: {
          green: '#34D399',
          rose: '#F87171',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'SF Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
