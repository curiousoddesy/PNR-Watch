/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Jobs-inspired design tokens
        ink: {
          DEFAULT: 'var(--color-ink)',
          muted: 'var(--color-ink-muted)',
        },
        surface: 'var(--color-surface)',
        ground: 'var(--color-ground)',
        edge: 'var(--color-edge)',
        brand: {
          DEFAULT: 'var(--color-brand)',
        },

        // Legacy colors for existing components
        primary: {
          DEFAULT: 'var(--color-primary)',
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
          400: '#60a5fa', 500: 'var(--color-primary)', 600: '#2563eb',
          700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
          400: '#94a3b8', 500: 'var(--color-secondary)', 600: '#475569',
          700: '#334155', 800: '#1e293b', 900: '#0f172a',
        },
        background: 'var(--color-background)',
        text: {
          DEFAULT: 'var(--color-text)',
          secondary: 'var(--color-text-secondary)',
        },
        border: 'var(--color-border)',
        success: {
          DEFAULT: 'var(--color-success)',
          50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 400: '#4ade80',
          500: 'var(--color-success)', 600: '#16a34a', 700: '#15803d',
          800: '#166534', 900: '#14532d',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 400: '#fbbf24',
          500: 'var(--color-warning)', 600: '#d97706', 700: '#b45309',
          800: '#92400e', 900: '#78350f',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 400: '#f87171',
          500: 'var(--color-error)', 600: '#dc2626', 700: '#b91c1c',
          800: '#991b1b', 900: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Syne', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
  ],
  darkMode: 'class',
}
