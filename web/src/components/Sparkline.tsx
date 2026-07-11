import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts'

interface Props {
  data:   number[]
  height?: number
}

export function Sparkline({ data, height = 48 }: Props) {
  if (data.length < 2) {
    return <div style={{ height }} className="flex items-center justify-center text-slate-700 text-xs font-mono">waiting...</div>
  }

  const first = data[0]
  const last  = data[data.length - 1]
  const up    = last >= first
  const color = up ? '#00dc82' : '#ff4560'

  const chartData = data.map((price, i) => ({ i, price }))
  const min = Math.min(...data)
  const max = Math.max(...data)
  // Pad domain slightly so the line isn't clipped at the edge
  const pad = (max - min) * 0.1 || 1
  const domain: [number, number] = [min - pad, max + pad]

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <YAxis domain={domain} hide />
          <Line
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
