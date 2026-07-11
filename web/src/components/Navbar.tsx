import { Link, useLocation } from 'react-router-dom'
import type { ConnState } from '../types'

export const SYMBOLS = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD', 'DOGE/USD']

const STATUS_CONFIG: Record<ConnState, { dot: string; label: string }> = {
  live:         { dot: 'bg-bid animate-pulse', label: 'LIVE' },
  connecting:   { dot: 'bg-yellow-400 animate-pulse', label: 'CONNECTING' },
  disconnected: { dot: 'bg-red-500', label: 'OFFLINE' },
}

interface Props {
  status:   ConnState
  symbol:   string
  onSymbol: (s: string) => void
}

export function Navbar({ status, symbol, onSymbol }: Props) {
  const { pathname } = useLocation()
  const { dot, label } = STATUS_CONFIG[status]

  const navLink = (to: string, text: string) => (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
        pathname === to
          ? 'text-white bg-white/5'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
      }`}
    >
      {text}
    </Link>
  )

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#080b14]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">

        {/* Left: brand + page links */}
        <div className="flex items-center gap-5 shrink-0">
          <Link
            to="/"
            className="font-bold text-base tracking-widest bg-gradient-to-r from-bid to-mid bg-clip-text text-transparent"
          >
            LOBSTER
          </Link>
          <div className="flex items-center gap-0.5">
            {navLink('/', 'Live')}
            {navLink('/architecture', 'Architecture')}
            {navLink('/performance', 'Performance')}
          </div>
        </div>

        {/* Center: symbol switcher (only visible on Live page) */}
        {pathname === '/' && (
          <div className="flex items-center gap-1">
            {SYMBOLS.map(s => (
              <button
                key={s}
                onClick={() => onSymbol(s)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                  symbol === s
                    ? 'bg-white/10 text-white border border-white/15'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                {s.replace('/USD', '')}
              </button>
            ))}
          </div>
        )}

        {/* Right: status */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 shrink-0">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          <span>{label}</span>
        </div>
      </div>
    </nav>
  )
}
