import { useMemo } from 'react'
import type { BookSnapshot, ConnState } from '../types'
import { DepthChart }      from '../components/DepthChart'
import { OrderBookTable }  from '../components/OrderBookTable'
import { Sparkline }       from '../components/Sparkline'

const fmtPrice = (p: number) =>
  p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface Props {
  book:         BookSnapshot
  status:       ConnState
  symbol:       string
  priceHistory: number[]
}

export function Live({ book, status, symbol, priceHistory }: Props) {
  const { bids, asks, spread, mid } = book
  const hasMid = mid > 0

  // Price change % over the visible history window
  const pctChange = useMemo(() => {
    if (priceHistory.length < 2) return null
    const first = priceHistory[0]
    const last  = priceHistory[priceHistory.length - 1]
    return ((last - first) / first) * 100
  }, [priceHistory])

  // Total visible liquidity on each side
  const totalBidQty = useMemo(() => bids.reduce((s, l) => s + l.qty, 0), [bids])
  const totalAskQty = useMemo(() => asks.reduce((s, l) => s + l.qty, 0), [asks])

  const base = symbol.replace('/USD', '')

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-5 flex flex-col gap-5">

      {/* Hero row */}
      <div className="flex items-start justify-between gap-4">
        {/* Price + sparkline */}
        <div className="flex-1 min-w-0">
          <div className="text-slate-500 text-xs font-mono tracking-widest mb-1">{symbol}</div>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-bold font-mono ${hasMid ? 'text-white' : 'text-slate-700'}`}>
              {hasMid ? `$${fmtPrice(mid)}` : '$—'}
            </span>
            {pctChange !== null && (
              <span className={`text-sm font-mono font-medium ${pctChange >= 0 ? 'text-bid' : 'text-ask'}`}>
                {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(3)}%
              </span>
            )}
          </div>
          <div className="mt-2">
            <Sparkline data={priceHistory} height={44} />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 shrink-0">
          <div className="text-right">
            <div className="text-slate-600 text-xs font-mono mb-0.5">SPREAD</div>
            <div className={`font-mono text-base font-semibold ${spread > 0 ? 'text-slate-300' : 'text-ask'}`}>
              {spread !== 0 ? `$${fmtPrice(Math.abs(spread))}` : '—'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-600 text-xs font-mono mb-0.5">BID DEPTH</div>
            <div className="font-mono text-sm text-bid">
              {totalBidQty > 0 ? `${totalBidQty.toFixed(3)} ${base}` : '—'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-600 text-xs font-mono mb-0.5">BEST BID</div>
            <div className="font-mono text-sm text-bid">
              {bids[0] ? `$${fmtPrice(bids[0].price)}` : '—'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-600 text-xs font-mono mb-0.5">ASK DEPTH</div>
            <div className="font-mono text-sm text-ask">
              {totalAskQty > 0 ? `${totalAskQty.toFixed(3)} ${base}` : '—'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-600 text-xs font-mono mb-0.5">BEST ASK</div>
            <div className="font-mono text-sm text-ask">
              {asks[0] ? `$${fmtPrice(asks[0].price)}` : '—'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-600 text-xs font-mono mb-0.5">MID</div>
            <div className="font-mono text-sm text-mid">
              {hasMid ? `$${fmtPrice(mid)}` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Depth chart */}
      <div className="bg-[#0a0d18] border border-white/5 rounded-xl p-4">
        <div className="text-slate-600 text-xs font-mono mb-3 tracking-wider">MARKET DEPTH</div>
        <DepthChart bids={bids} asks={asks} mid={mid} />
      </div>

      {/* Order book */}
      <div>
        <div className="text-slate-600 text-xs font-mono mb-2 tracking-wider">ORDER BOOK (top 10)</div>
        <OrderBookTable bids={bids} asks={asks} />
      </div>

      {status !== 'live' && (
        <div className="text-center text-slate-600 text-xs font-mono py-1">
          {status === 'connecting' ? `Connecting to ${symbol}...` : `Reconnecting to ${symbol}...`}
        </div>
      )}
    </div>
  )
}
