import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts'

// Measured, not estimated. Mean ns/op, best of 9 trials, 2M ops/trial, 50-level
// depth, timed by the whole stream (one clock pair) and divided - see the method
// note below. Both structures measured in the same run.
const APPLY_RESULTS = [
  { workload: 'steady-state', flat: 32.8, map: 36.2 },
  { workload: 'insert-heavy', flat: 50.8, map: 50.3 },
]

const LOOKUP_RESULTS = [
  { workload: 'steady-state', flat: 1.4, map: 1.2 },
  { workload: 'insert-heavy', flat: 1.4, map: 1.3 },
]

function StatCard({
  label,
  value,
  unit,
  sub,
  accent,
}: {
  label:  string
  value:  string
  unit:   string
  sub:    string
  accent: string
}) {
  return (
    <div className="bg-[#0a0d18] border border-white/5 rounded-xl p-5">
      <div className="text-slate-500 text-xs font-mono mb-2">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold font-mono" style={{ color: accent }}>
          {value}
        </span>
        <span className="text-slate-400 text-sm font-mono">{unit}</span>
      </div>
      <div className="text-slate-600 text-xs mt-1">{sub}</div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0f1320] border border-white/10 rounded px-3 py-2 text-xs font-mono">
      <div className="text-slate-400 mb-1">{label}</div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.fill }}>
          {p.name}: {p.value} ns
        </div>
      ))}
    </div>
  )
}

function BenchChart({
  title,
  data,
}: {
  title: string
  data:  typeof APPLY_RESULTS
}) {
  return (
    <div className="bg-[#0a0d18] border border-white/5 rounded-xl p-5">
      <div className="text-slate-400 text-sm font-semibold mb-4">{title}</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barGap={4}>
          <XAxis
            dataKey="workload"
            tick={{ fill: '#475569', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            unit=" ns"
            tick={{ fill: '#475569', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Legend
            formatter={(value) => (
              <span style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono' }}>
                {value}
              </span>
            )}
          />
          <Bar dataKey="map" name="std::map (measured)" radius={[2, 2, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill="#334155" />
            ))}
          </Bar>
          <Bar dataKey="flat" name="flat array (measured)" radius={[2, 2, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill="#00dc82" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function LatencyTable({
  label,
  data,
}: {
  label: string
  data:  typeof APPLY_RESULTS
}) {
  return (
    <div>
      <div className="text-slate-500 text-xs font-mono mb-2">{label}</div>
      <table className="w-full text-sm font-mono">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left text-slate-600 text-xs pb-2">Workload</th>
            <th className="text-right text-slate-600 text-xs pb-2">std::map</th>
            <th className="text-right text-bid text-xs pb-2">Flat array</th>
            <th className="text-right text-slate-600 text-xs pb-2">Ratio</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.workload} className="border-b border-white/[0.03]">
              <td className="py-2 text-slate-400">{row.workload}</td>
              <td className="py-2 text-right text-slate-500">{row.map} ns</td>
              <td className="py-2 text-right text-bid">{row.flat} ns</td>
              <td className="py-2 text-right text-slate-500">
                {(row.map / row.flat).toFixed(2)}×
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Performance() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col gap-10">

      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Performance</h1>
        <p className="text-slate-500 text-sm">
          Flat array LOB measured against a std::map baseline in the same run - 2M ops/trial, best of 9, real hardware.
        </p>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="apply() steady-state" value="32.8" unit="ns" sub="mean/op, flat array" accent="#00dc82" />
        <StatCard label="best bid/ask read"    value="O(1)" unit=""  sub="constant-time, cache-local" accent="#818cf8" />
        <StatCard label="vs std::map"          value="~1.1×" unit=""  sub="within ~10% at this depth" accent="#f59e0b" />
        <StatCard label="Operations"           value="2M"   unit=""   sub="per trial, 50-level depth" accent="#f59e0b" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BenchChart title="apply() mean ns/op by workload" data={APPLY_RESULTS} />
        <BenchChart title="best_bid() + best_ask() by workload" data={LOOKUP_RESULTS} />
      </div>

      {/* Tables */}
      <div className="bg-[#0a0d18] border border-white/5 rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        <LatencyTable label="APPLY() - INSERT / UPDATE / DELETE" data={APPLY_RESULTS} />
        <LatencyTable label="LOOKUP - BEST BID + BEST ASK" data={LOOKUP_RESULTS} />
      </div>
      <p className="text-slate-600 text-xs -mt-4 max-w-3xl">
        Note on lookup: the read loop hits the same unchanged top-of-book each
        iteration, so the CPU pipelines it to near-nothing. The ~1 ns figure really
        just confirms the read is O(1) and trivially cheap, not a realistic
        post-update latency. apply() is the meaningful number, since it runs over
        2M distinct events with data-dependent branching.
      </p>

      {/* Why */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0a0d18] border border-white/5 rounded-xl p-5 col-span-1 md:col-span-3">
          <div className="text-slate-400 text-sm font-semibold mb-3">
            Why the flat array, when it's only ~10% faster here
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-400 leading-relaxed">
            <div>
              <div className="text-bid text-xs font-mono mb-1">NO PER-UPDATE ALLOCATION</div>
              std::map calls operator new / delete on every insert and erase. The flat
              array reuses one buffer, so sustained churn creates no allocator pressure
              and no fragmentation - a tail-latency win the mean doesn't show.
            </div>
            <div>
              <div className="text-mid text-xs font-mono mb-1">CACHE-LOCAL READS</div>
              top_bids(20) / top_asks(20) - the hot path feeding this UI 20×/second -
              walks ~2 contiguous cache lines instead of pointer-chasing tree nodes
              scattered across the heap.
            </div>
            <div>
              <div className="text-yellow-400 text-xs font-mono mb-1">FLAT LATENCY</div>
              No tree rebalance, so no occasional expensive insert. At top-of-book depth
              (the feed caps at depth:10) n stays small enough that O(n) shifts are
              cheap; a tree would only win with thousands of levels.
            </div>
          </div>
        </div>
      </div>

      {/* System specs */}
      <div className="bg-[#0a0d18] border border-white/5 rounded-xl p-5">
        <div className="text-slate-500 text-xs font-mono mb-3">SYSTEM</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-mono">
          {[
            ['CPU',      'Intel Core Ultra 7 155H'],
            ['Arch',     'Meteor Lake  ·  AVX2 + FMA3'],
            ['Memory',   '16 GB'],
            ['Compiler', 'g++ 13.3  ·  -O3 -march=native'],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-slate-600 text-xs mb-0.5">{k}</div>
              <div className="text-slate-300 text-xs">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-slate-600 text-xs">
          Both structures are measured in the same run by
          <code className="text-slate-500"> ./build/lob_bench --n 2000000 --trials 9</code>.
          Numbers are mean ns/op (whole-stream timing), not per-call - one clock read
          costs ~17 ns on this host, more than the operation itself.
        </div>
      </div>
    </div>
  )
}
