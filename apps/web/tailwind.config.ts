import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0d1b35',
          card: '#162347',
          light: '#1e2d4a',
          white: '#ffffff',
        },
        orange: {
          DEFAULT: '#f04e23',
          light: '#f26540',
          dark: '#d03d15',
        },
        green: {
          DEFAULT: '#2d7a4f',
          light: '#3a9a64',
          dark: '#1f5537',
        },
        text: {
          DEFAULT: '#ffffff',
          muted: '#8da4c4',
          dark: '#1a2a44',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
