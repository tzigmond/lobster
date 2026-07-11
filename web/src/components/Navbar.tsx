import { Link, useLocation } from 'react-router-dom'
import type { ConnState } from '../types'

const STATUS_CONFIG: Record<ConnState, { dot: string; label: string }> = {
  live:         { dot: 'bg-bid animate-pulse', label: 'LIVE' },
  connecting:   { dot: 'bg-yellow-400 animate-pulse', label: 'CONNECTING' },
  disconnected: { dot: 'bg-red-500', label: 'OFFLINE' },
}

function StatusBadge({ status }: { status: ConnState }) {
  const { dot, label } = STATUS_CONFIG[status]
  return (
    <div className="flex items-center gap-2 text-xs font-mono font-medium text-slate-400">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span>{label}</span>
    </div>
  )
}

export function Navbar({ status }: { status: ConnState }) {
  const { pathname } = useLocation()

  const link = (to: string, label: string) => (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
        pathname === to
          ? 'text-white bg-white/5'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#080b14]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="font-bold text-base tracking-widest bg-gradient-to-r from-bid to-mid bg-clip-text text-transparent"
          >
            LOBSTER
          </Link>
          <div className="flex items-center gap-1">
            {link('/', 'Live')}
            {link('/architecture', 'Architecture')}
            {link('/performance', 'Performance')}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>
    </nav>
  )
}
