/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pnr_input/**/*.html",
    "./ticket_status_display_*/**/*.html",
    "./pnr_history_*/**/*.html",
    "./*.js"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#137fec',
        'background-light': '#f6f7f8',
        'background-dark': '#101922'
      },
      fontFamily: {
        sans: ['Public Sans', 'system-ui', 'sans-serif']
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700'
      },
      animation: {
        'spin': 'spin 1s linear infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce': 'bounce 1s infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'shake': 'shake 0.5s ease-in-out',
        'bounce-in': 'bounceIn 0.6s ease-out',
        'checkmark': 'checkmark 0.5s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' }
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' }
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        checkmark: {
          '0%': { transform: 'scale(0)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' }
        }
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem'
      },
      minHeight: {
        'screen-dvh': 'max(884px, 100dvh)'
      },
      boxShadow: {
        'status-card': '0 0 4px rgba(0, 0, 0, 0.1)',
        'performance': '0 10px 25px rgba(0, 0, 0, 0.1)'
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: [
    // Custom plugin for performance optimizations
    function({ addUtilities, addComponents, theme }) {
      // Add performance-optimized utilities
      addUtilities({
        '.loading-shimmer': {
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
          backgroundSize: '200px 100%',
          animation: 'shimmer 1.5s infinite'
        },
        '.dark .loading-shimmer': {
          background: 'linear-gradient(90deg, #374151 25%, #4b5563 50%, #374151 75%)',
          backgroundSize: '200px 100%'
        },
        '.skeleton': {
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
          backgroundSize: '200px 100%',
          animation: 'shimmer 1.5s infinite',
          borderRadius: '4px'
        },
        '.dark .skeleton': {
          background: 'linear-gradient(90deg, #374151 25%, #4b5563 50%, #374151 75%)',
          backgroundSize: '200px 100%'
        },
        '.btn-loading': {
          position: 'relative',
          color: 'transparent !important',
          '&::after': {
            content: '""',
            position: 'absolute',
            width: '16px',
            height: '16px',
            top: '50%',
            left: '50%',
            marginLeft: '-8px',
            marginTop: '-8px',
            border: '2px solid transparent',
            borderTopColor: 'currentColor',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }
        },
        '.hover-lift': {
          transition: 'transform 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)'
          }
        },
        '.focus-ring': {
          '&:focus': {
            outline: '2px solid #137fec',
            outlineOffset: '2px'
          }
        },
        '.safe-area-inset-top': {
          paddingTop: 'max(1rem, env(safe-area-inset-top))'
        },
        '.safe-area-inset-bottom': {
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
        },
        '.safe-area-inset-left': {
          paddingLeft: 'max(1rem, env(safe-area-inset-left))'
        },
        '.safe-area-inset-right': {
          paddingRight: 'max(1rem, env(safe-area-inset-right))'
        }
      });

      // Add responsive component classes
      addComponents({
        '.responsive-container': {
          width: '100%',
          maxWidth: '100%',
          '@screen sm': {
            maxWidth: '640px'
          },
          '@screen md': {
            maxWidth: '768px'
          },
          '@screen lg': {
            maxWidth: '1024px'
          }
        },
        '.responsive-card': {
          padding: '1rem',
          marginBottom: '0.75rem',
          '@screen sm': {
            padding: '1.25rem',
            marginBottom: '1rem'
          },
          '@screen lg': {
            padding: '1.5rem',
            marginBottom: '1.25rem'
          }
        },
        '.responsive-button': {
          height: '3rem',
          fontSize: '0.875rem',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          '@screen sm': {
            height: '3.5rem',
            fontSize: '1rem',
            paddingLeft: '1.5rem',
            paddingRight: '1.5rem'
          }
        },
        '.responsive-input': {
          height: '3rem',
          fontSize: '1rem',
          paddingLeft: '0.75rem',
          paddingRight: '0.75rem',
          '@screen sm': {
            height: '3.5rem',
            paddingLeft: '1rem',
            paddingRight: '1rem'
          }
        },
        '.responsive-nav': {
          padding: '0.75rem 1rem',
          '@screen sm': {
            padding: '1rem 1.5rem'
          }
        },
        '.responsive-floating': {
          bottom: '1rem',
          right: '1rem',
          width: '3.5rem',
          height: '3.5rem',
          '@screen sm': {
            bottom: '1.5rem',
            right: '1.5rem'
          }
        }
      });
    },
    
    // Plugin for dark mode enhancements
    function({ addUtilities }) {
      addUtilities({
        '.dark-mode-transition': {
          transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease'
        }
      });
    }
  ],
  
  // Optimize for production
  ...(process.env.NODE_ENV === 'production' && {
    corePlugins: {
      // Disable unused core plugins for smaller bundle
      preflight: true,
      container: false,
      accessibility: true,
      alignContent: true,
      alignItems: true,
      alignSelf: true,
      animation: true,
      appearance: true,
      backdropBlur: false,
      backdropBrightness: false,
      backdropContrast: false,
      backdropFilter: false,
      backdropGrayscale: false,
      backdropHueRotate: false,
      backdropInvert: false,
      backdropOpacity: false,
      backdropSaturate: false,
      backdropSepia: false,
      backgroundAttachment: false,
      backgroundClip: true,
      backgroundColor: true,
      backgroundImage: false,
      backgroundOpacity: true,
      backgroundPosition: false,
      backgroundRepeat: false,
      backgroundSize: false,
      blur: false,
      borderCollapse: true,
      borderColor: true,
      borderOpacity: true,
      borderRadius: true,
      borderStyle: true,
      borderWidth: true,
      boxDecorationBreak: false,
      boxShadow: true,
      boxSizing: true,
      brightness: false,
      clear: false,
      contrast: false,
      cursor: true,
      display: true,
      divideColor: false,
      divideOpacity: false,
      divideStyle: false,
      divideWidth: false,
      dropShadow: false,
      fill: false,
      filter: false,
      flex: true,
      flexDirection: true,
      flexGrow: true,
      flexShrink: true,
      flexWrap: true,
      float: false,
      fontFamily: true,
      fontSize: true,
      fontSmoothing: true,
      fontStyle: false,
      fontVariantNumeric: false,
      fontWeight: true,
      gap: true,
      gradientColorStops: false,
      grayscale: false,
      gridAutoColumns: false,
      gridAutoFlow: false,
      gridAutoRows: false,
      gridColumn: false,
      gridColumnEnd: false,
      gridColumnStart: false,
      gridRow: false,
      gridRowEnd: false,
      gridRowStart: false,
      gridTemplateColumns: true,
      gridTemplateRows: false,
      height: true,
      hueRotate: false,
      inset: true,
      invert: false,
      isolation: false,
      justifyContent: true,
      justifyItems: false,
      justifySelf: false,
      letterSpacing: false,
      lineHeight: true,
      listStylePosition: false,
      listStyleType: false,
      margin: true,
      maxHeight: true,
      maxWidth: true,
      minHeight: true,
      minWidth: true,
      mixBlendMode: false,
      objectFit: false,
      objectPosition: false,
      opacity: true,
      order: false,
      outline: true,
      overflow: true,
      overscrollBehavior: false,
      padding: true,
      placeContent: false,
      placeItems: false,
      placeSelf: false,
      placeholderColor: true,
      placeholderOpacity: true,
      pointerEvents: true,
      position: true,
      resize: false,
      ringColor: true,
      ringOffsetColor: false,
      ringOffsetWidth: false,
      ringOpacity: true,
      ringWidth: true,
      rotate: false,
      saturate: false,
      scale: false,
      sepia: false,
      skew: false,
      space: false,
      stroke: false,
      strokeWidth: false,
      tableLayout: false,
      textAlign: true,
      textColor: true,
      textDecoration: true,
      textDecorationColor: false,
      textDecorationStyle: false,
      textDecorationThickness: false,
      textIndent: false,
      textOpacity: true,
      textOverflow: true,
      textTransform: false,
      textUnderlineOffset: false,
      transform: true,
      transformOrigin: false,
      transitionDelay: false,
      transitionDuration: true,
      transitionProperty: true,
      transitionTimingFunction: true,
      translate: true,
      userSelect: true,
      verticalAlign: false,
      visibility: true,
      whitespace: true,
      width: true,
      wordBreak: false,
      zIndex: true
    }
  })
};