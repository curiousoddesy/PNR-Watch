/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: 'var(--color-ink)',
          muted: 'var(--color-ink-muted)',
        },
        surface: 'var(--color-surface)',
        'surface-solid': 'var(--color-surface-solid)',
        ground: 'var(--color-ground)',
        edge: 'var(--color-edge)',
        brand: {
          DEFAULT: 'var(--color-brand)',
        },

        primary: {
          DEFAULT: 'var(--color-primary)',
          50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD',
          400: '#60A5FA', 500: 'var(--color-primary)', 600: '#2563EB',
          700: '#1D4ED8', 800: '#1E40AF', 900: '#1E3A8A',
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
          50: '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0', 400: '#34D399',
          500: 'var(--color-success)', 600: '#059669', 700: '#047857',
          800: '#065F46', 900: '#064E3B',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 400: '#FBBF24',
          500: 'var(--color-warning)', 600: '#D97706', 700: '#B45309',
          800: '#92400E', 900: '#78350F',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 400: '#F87171',
          500: 'var(--color-error)', 600: '#DC2626', 700: '#B91C1C',
          800: '#991B1B', 900: '#7F1D1D',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '24px',
        '4xl': '32px',
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
