import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useThemeContext } from '../../contexts/ThemeContext'
import { cn } from '../../utils/cn'

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation()
  const { currentMode, setThemeMode } = useThemeContext()

  return (
    <div className="min-h-screen bg-paper text-ink antialiased">
      <header
        className="sticky top-0 z-30 bg-paper/85 backdrop-blur-md"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto max-w-2xl px-6 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="link flex items-baseline gap-0.5 text-[17px] font-semibold tracking-tight"
            aria-label="PNR. — Home"
          >
            <span>PNR</span>
            <span className="text-accent">.</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              to="/tracking"
              className={cn(
                'px-3 py-1.5 text-[13px] font-medium rounded-full transition-colors',
                location.pathname === '/tracking'
                  ? 'text-ink bg-rule'
                  : 'text-ink-2 hover:text-ink'
              )}
            >
              Trips
            </Link>
            <button
              onClick={() => setThemeMode(currentMode === 'dark' ? 'light' : 'dark')}
              className="btn-icon"
              aria-label={`Switch to ${currentMode === 'dark' ? 'light' : 'dark'} mode`}
            >
              {currentMode === 'dark' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </nav>
        </div>
        <div className="h-px bg-rule" />
      </header>

      <main key={location.pathname} className="mx-auto max-w-2xl px-6">
        {children}
      </main>

      <footer className="mx-auto max-w-2xl px-6 py-10 mt-12">
        <div className="border-t border-rule pt-6 flex items-center justify-between text-[12px] text-ink-3 tracking-tight">
          <span>PNR. — quiet, automatic, always current.</span>
          <span aria-hidden="true">·</span>
        </div>
      </footer>
    </div>
  )
}
