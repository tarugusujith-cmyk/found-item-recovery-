/** @type {import('tailwindcss').Config} */
const v = (n) => `rgb(var(--${n}) / <alpha-value>)`;
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: v('paper'), surface: v('surface'), line: v('line'), ink: v('ink'), muted: v('muted'), btn: v('btn'),
        night: '#0B1B3A', lost: '#F0564A', found: '#0EA89A', tag: '#FFC53D',
      },
      fontFamily: { sans: ['"Avenir Next"', '"Segoe UI Variable"', '"Segoe UI"', 'Inter', 'system-ui', 'sans-serif'] },
      boxShadow: {
        soft: '0 1px 2px rgb(11 27 58 / 0.04), 0 8px 24px -12px rgb(11 27 58 / 0.12)',
        lift: '0 2px 4px rgb(11 27 58 / 0.05), 0 18px 36px -14px rgb(11 27 58 / 0.25)',
      },
      keyframes: {
        drop: { '0%': { opacity: 0, transform: 'translateY(-28px) rotate(-8deg)' }, '100%': { opacity: 1, transform: 'translateY(0) rotate(var(--r, 0deg))' } },
        rise: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
      },
      animation: { drop: 'drop .7s cubic-bezier(.2,.9,.3,1.2) both', rise: 'rise .35s ease-out both' },
    },
  },
  plugins: [],
};
