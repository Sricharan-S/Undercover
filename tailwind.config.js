/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f8fafc',
          100: '#e2e8f0',
          200: '#cbd5e1',
          300: '#94a3b8',
          400: '#64748b',
          500: '#475569',
          600: '#334155',
          700: '#1e293b',
          800: '#0f172a',
          900: '#020617',
        },
        accent: {
          DEFAULT: '#f59e0b',
          dark: '#b45309',
        },
        danger: '#ef4444',
        good: '#22c55e',
      },
      boxShadow: {
        card: '0 10px 30px -10px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
};
