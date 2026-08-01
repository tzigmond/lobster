import { Link, useLocation } from 'react-router-dom'
import type { ConnState } from '../types'

export const SYMBOLS = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD', 'DOGE/USD']

interface Props {
  status:   ConnState
  symbol:   string
  onSymbol: (s: string) => void
}

export function Navbar({ status, symbol, onSymbol }: Props) {
  const { pathname } = useLocation()

  const isLive  = status === 'live'
  const isConn  = status === 'connecting'

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={`text-sm font-medium tracking-wide transition-colors ${
        pathname === to ? 'text-hi' : 'text-muted hover:text-body'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <header className="sticky top-0 z-50 border-b border-rim bg-ink/95 backdrop-blur-sm">
      <div className="max-w-screen-xl mx-auto px-5 h-12 flex items-center gap-6">

        {/* Brand */}
        <Link to="/" className="font-mono font-semibold text-sm tracking-[0.2em] text-hi shrink-0">
          LOBSTER
        </Link>

        <div className="w-px h-4 bg-rim shrink-0" />

        {/* Page nav */}
        <nav className="flex items-center gap-5">
          {navLink('/', 'Live')}
          {navLink('/architecture', 'Architecture')}
          {navLink('/performance', 'Performance')}
        </nav>

        {/* Symbol switcher - only on Live page */}
        {pathname === '/' && (
          <>
            <div className="w-px h-4 bg-rim" />
            <div className="flex items-center gap-1">
              {SYMBOLS.map(s => {
                const base = s.replace('/USD', '')
                const active = symbol === s
                return (
                  <button
                    key={s}
                    onClick={() => onSymbol(s)}
                    className={`px-2.5 py-1 rounded font-mono text-xs tracking-wide transition-all ${
                      active
                        ? 'bg-shell text-hi border border-rim'
                        : 'text-muted hover:text-body border border-transparent'
                    }`}
                  >
                    {base}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Status */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isLive ? 'bg-bid animate-pulse' : isConn ? 'bg-yellow-500 animate-pulse' : 'bg-ask'
            }`}
          />
          <span className="font-mono text-[10px] tracking-widest text-muted">
            {isLive ? 'LIVE' : isConn ? 'CONNECTING' : 'OFFLINE'}
          </span>
        </div>
      </div>
    </header>
  )
}
