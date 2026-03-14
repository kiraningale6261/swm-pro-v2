import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        glass: {
          light: 'rgba(255, 255, 255, 0.7)',
          lighter: 'rgba(255, 255, 255, 0.5)',
          dark: 'rgba(15, 23, 42, 0.1)',
        },
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c3d66',
        },
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      backgroundImage: {
        'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.5) 100%)',
        'gradient-blue': 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(2, 132, 199, 0.1) 100%)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
