import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { Level } from '../types'

interface DepthPoint {
  price:   number
  bidVol?: number
  askVol?: number
}

function buildDepthData(bids: Level[], asks: Level[]): DepthPoint[] {
  // Bids: accumulate from best bid outward (highest price → lowest price)
  const bidPoints: DepthPoint[] = []
  let cumBid = 0
  for (const b of [...bids].sort((a, b) => b.price - a.price)) {
    cumBid += b.qty
    bidPoints.push({ price: b.price, bidVol: cumBid })
  }
  bidPoints.reverse() // ascending price order for the chart

  // Asks: accumulate from best ask outward (lowest price → highest price)
  const askPoints: DepthPoint[] = []
  let cumAsk = 0
  for (const a of [...asks].sort((a, b) => a.price - b.price)) {
    cumAsk += a.qty
    askPoints.push({ price: a.price, askVol: cumAsk })
  }

  return [...bidPoints, ...askPoints]
}

const fmtPrice = (p: number) =>
  p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtQty = (q: number) => `${q.toFixed(4)} BTC`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  const isBid = entry.dataKey === 'bidVol'
  return (
    <div className="bg-[#0f1320] border border-white/10 rounded px-3 py-2 text-xs font-mono">
      <div className="text-slate-400 mb-1">${fmtPrice(label as number)}</div>
      <div className={isBid ? 'text-bid' : 'text-ask'}>
        {isBid ? 'Cumulative bid' : 'Cumulative ask'}: {fmtQty(entry.value as number)}
      </div>
    </div>
  )
}

interface Props {
  bids: Level[]
  asks: Level[]
  mid:  number
}

export function DepthChart({ bids, asks, mid }: Props) {
  const data = buildDepthData(bids, asks)
  if (data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-slate-600 text-sm font-mono">
        waiting for data...
      </div>
    )
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gradBid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#00dc82" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#00dc82" stopOpacity={0.03} />
            </linearGradient>
            <linearGradient id="gradAsk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#ff4560" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#ff4560" stopOpacity={0.03} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="price"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={fmtPrice}
            tick={{ fill: '#475569', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={{ stroke: '#1e293b' }}
          />
          <YAxis
            tickFormatter={(v: number) => v.toFixed(2)}
            tick={{ fill: '#475569', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1 }} />

          {mid > 0 && (
            <ReferenceLine
              x={mid}
              stroke="#818cf8"
              strokeDasharray="4 3"
              strokeWidth={1}
              label={{
                value: `$${fmtPrice(mid)}`,
                position: 'top',
                fill: '#818cf8',
                fontSize: 10,
                fontFamily: 'JetBrains Mono',
              }}
            />
          )}

          <Area
            type="stepBefore"
            dataKey="bidVol"
            stroke="#00dc82"
            strokeWidth={1.5}
            fill="url(#gradBid)"
            connectNulls={false}
            dot={false}
            activeDot={{ r: 3, fill: '#00dc82' }}
          />
          <Area
            type="stepAfter"
            dataKey="askVol"
            stroke="#ff4560"
            strokeWidth={1.5}
            fill="url(#gradAsk)"
            connectNulls={false}
            dot={false}
            activeDot={{ r: 3, fill: '#ff4560' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
