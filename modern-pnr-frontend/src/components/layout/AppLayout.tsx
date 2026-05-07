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
  const isHome = location.pathname === '/'

  return (
    <div className="min-h-screen bg-paper text-ink antialiased">
      <header
        className="sticky top-0 z-30 bg-paper/80 backdrop-blur-md"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto max-w-2xl px-6 h-14 flex items-center justify-between">
          <Link to="/" className="link flex items-baseline gap-1 text-[17px] font-semibold tracking-tight">
            <span>PNR</span>
            <span className="text-accent">.</span>
          </Link>

          <div className="flex items-center gap-1">
            {!isHome && (
              <Link
                to="/"
                className="link text-[13px] font-medium text-ink-2 mr-2"
              >
                Search
              </Link>
            )}
            <Link
              to="/tracking"
              className={cn(
                'text-[13px] font-medium mr-2 transition-opacity',
                location.pathname === '/tracking' ? 'text-ink' : 'text-ink-2 hover:opacity-60'
              )}
            >
              Trips
            </Link>
            <button
              onClick={() => setThemeMode(currentMode === 'dark' ? 'light' : 'dark')}
              className="btn-icon"
              aria-label="Toggle theme"
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
          </div>
        </div>
        <div className="h-px bg-rule" />
      </header>

      <main className="mx-auto max-w-2xl px-6">
        {children}
      </main>

      <footer className="mx-auto max-w-2xl px-6 py-12 mt-12 border-t border-rule">
        <p className="text-[12px] text-ink-3 tracking-tight">
          PNR. — Live train status, beautifully simple.
        </p>
      </footer>
    </div>
  )
}
