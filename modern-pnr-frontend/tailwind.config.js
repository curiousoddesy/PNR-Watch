/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        ink: {
          DEFAULT: 'var(--ink)',
          2: 'var(--ink-2)',
          3: 'var(--ink-3)',
        },
        rule: {
          DEFAULT: 'var(--rule)',
          strong: 'var(--rule-strong)',
        },
        accent: 'var(--accent)',
        // Legacy aliases — kept so any leftover references still compile.
        'ink-muted': 'var(--ink-2)',
        ground: 'var(--paper)',
        surface: 'var(--paper)',
        'surface-solid': 'var(--paper)',
        edge: 'var(--rule)',
        brand: 'var(--accent)',
        primary: 'var(--ink)',
        secondary: 'var(--ink-2)',
        background: 'var(--paper)',
        text: {
          DEFAULT: 'var(--ink)',
          secondary: 'var(--ink-2)',
        },
        border: 'var(--rule)',
        success: '#1D7A3E',
        warning: '#9A6B00',
        error: '#C8281C',
      },
      fontFamily: {
        sans: ['Inter var', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'system-ui', 'sans-serif'],
        display: ['Inter var', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'ui-monospace', 'JetBrains Mono', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.045em',
        tighter: '-0.025em',
        tight: '-0.015em',
      },
      borderRadius: {
        'xl': '14px',
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
