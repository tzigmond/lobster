import type { Level } from '../types'

const fmtPrice = (p: number) =>
  p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtQty = (q: number) => q.toFixed(4)

interface LevelRowProps {
  lvl:    Level
  maxQty: number
  side:   'bid' | 'ask'
}

function LevelRow({ lvl, maxQty, side }: LevelRowProps) {
  const pct = Math.min((lvl.qty / maxQty) * 100, 100)
  const isBid = side === 'bid'

  return (
    <div className="relative flex items-center h-7 px-3 hover:bg-white/[0.02] transition-colors">
      {/* Volume bar */}
      <div
        className={`absolute top-1 bottom-1 rounded-sm transition-[width] duration-150 ${
          isBid ? 'right-0 bg-bid/10' : 'left-0 bg-ask/10'
        }`}
        style={{ width: `${pct}%` }}
      />
      {isBid ? (
        <>
          <span className="relative font-mono text-slate-500 text-xs w-20">{fmtQty(lvl.qty)}</span>
          <span className="relative font-mono text-bid text-sm ml-auto">{fmtPrice(lvl.price)}</span>
        </>
      ) : (
        <>
          <span className="relative font-mono text-ask text-sm">{fmtPrice(lvl.price)}</span>
          <span className="relative font-mono text-slate-500 text-xs ml-auto w-20 text-right">{fmtQty(lvl.qty)}</span>
        </>
      )}
    </div>
  )
}

interface Props {
  bids: Level[]
  asks: Level[]
}

export function OrderBookTable({ bids, asks }: Props) {
  const allQtys = [...bids, ...asks].map(l => l.qty)
  const maxQty  = allQtys.length > 0 ? Math.max(...allQtys) : 1

  return (
    <div className="flex gap-px bg-white/5 rounded-lg overflow-hidden">
      {/* BID SIDE */}
      <div className="flex-1 bg-[#080b14]">
        <div className="flex items-center h-7 px-3 border-b border-white/5">
          <span className="text-slate-600 text-xs font-mono font-medium">QTY</span>
          <span className="ml-auto text-bid text-xs font-mono font-medium">BID</span>
        </div>
        {bids.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-slate-700 text-xs font-mono">
            —
          </div>
        ) : (
          bids.map(lvl => (
            <LevelRow key={lvl.price} lvl={lvl} maxQty={maxQty} side="bid" />
          ))
        )}
      </div>

      {/* ASK SIDE */}
      <div className="flex-1 bg-[#080b14]">
        <div className="flex items-center h-7 px-3 border-b border-white/5">
          <span className="text-ask text-xs font-mono font-medium">ASK</span>
          <span className="ml-auto text-slate-600 text-xs font-mono font-medium">QTY</span>
        </div>
        {asks.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-slate-700 text-xs font-mono">
            —
          </div>
        ) : (
          asks.map(lvl => (
            <LevelRow key={lvl.price} lvl={lvl} maxQty={maxQty} side="ask" />
          ))
        )}
      </div>
    </div>
  )
}
