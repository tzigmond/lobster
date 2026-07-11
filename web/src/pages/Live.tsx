import type { BookSnapshot, ConnState } from '../types'
import { DepthChart } from '../components/DepthChart'
import { OrderBookTable } from '../components/OrderBookTable'

const fmtPrice = (p: number) =>
  p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface Props {
  book:   BookSnapshot
  status: ConnState
}

export function Live({ book, status }: Props) {
  const { bids, asks, spread, mid } = book
  const isLive = status === 'live'
  const hasMid = mid > 0

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 flex flex-col gap-6">

      {/* Hero price row */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-slate-500 text-xs font-mono tracking-widest mb-1">BTC / USD</div>
          <div className={`text-4xl font-bold font-mono transition-colors ${hasMid ? 'text-white' : 'text-slate-700'}`}>
            {hasMid ? `$${fmtPrice(mid)}` : '$—'}
          </div>
        </div>

        <div className="flex items-end gap-8">
          <div className="text-right">
            <div className="text-slate-600 text-xs mb-1">SPREAD</div>
            <div className={`font-mono text-lg font-semibold ${spread > 0 ? 'text-slate-300' : 'text-ask'}`}>
              {spread !== 0 ? `$${fmtPrice(Math.abs(spread))}` : '—'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-600 text-xs mb-1">BEST BID</div>
            <div className="font-mono text-bid text-sm">
              {bids[0] ? `$${fmtPrice(bids[0].price)}` : '—'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-600 text-xs mb-1">BEST ASK</div>
            <div className="font-mono text-ask text-sm">
              {asks[0] ? `$${fmtPrice(asks[0].price)}` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Depth chart card */}
      <div className="bg-[#0a0d18] border border-white/5 rounded-xl p-4">
        <div className="text-slate-600 text-xs font-mono mb-3 tracking-wider">MARKET DEPTH</div>
        <DepthChart bids={bids} asks={asks} mid={mid} />
      </div>

      {/* Order book */}
      <div>
        <div className="text-slate-600 text-xs font-mono mb-3 tracking-wider">ORDER BOOK</div>
        <OrderBookTable bids={bids} asks={asks} />
      </div>

      {/* Footer */}
      {!isLive && (
        <div className="text-center text-slate-600 text-xs font-mono py-2">
          {status === 'connecting' ? 'Connecting to Kraken...' : 'Reconnecting...'}
        </div>
      )}
    </div>
  )
}
