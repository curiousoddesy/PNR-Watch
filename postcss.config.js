module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' && {
      '@fullhuman/postcss-purgecss': {
        content: [
          './index.html',
          './src/**/*.js',
          './pnr_input/**/*.html',
          './ticket_status_display_*/**/*.html',
          './pnr_history_*/**/*.html',
          './*.js'
        ],
        defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
        safelist: [
          'dark',
          /^bg-/,
          /^text-/,
          /^border-/,
          /^hover:/,
          /^focus:/,
          /^active:/,
          /^dark:/,
          'animate-spin',
          'animate-pulse',
          'animate-bounce',
          'loading-state',
          'error-shake',
          'success-bounce',
          'fade-in',
          'slide-up',
          'loading-shimmer',
          'skeleton',
          'btn-loading',
          'hover-lift',
          'focus-ring'
        ]
      },
      cssnano: {
        preset: ['default', {
          discardComments: {
            removeAll: true
          },
          normalizeWhitespace: true,
          colormin: true,
          convertValues: true,
          discardDuplicates: true,
          discardEmpty: true,
          mergeRules: true,
          minifyFontValues: true,
          minifyGradients: true,
          minifyParams: true,
          minifySelectors: true
        }]
      }
    })
  }
};