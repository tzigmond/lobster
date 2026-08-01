interface TechChip {
  label: string
}

function Chip({ label }: TechChip) {
  return (
    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-400 border border-white/8">
      {label}
    </span>
  )
}

interface FlowNodeProps {
  title:    string
  subtitle: string
  chips:    string[]
  accent:   string
}

function FlowNode({ title, subtitle, chips, accent }: FlowNodeProps) {
  return (
    <div
      className="flex-1 bg-[#0a0d18] border border-white/5 rounded-xl p-5"
      style={{ borderTopColor: accent, borderTopWidth: 2 }}
    >
      <div className="text-xs font-mono text-slate-500 mb-1">{subtitle}</div>
      <div className="font-semibold text-white mb-3">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map(c => <Chip key={c} label={c} />)}
      </div>
    </div>
  )
}

function Arrow() {
  return (
    <div className="flex flex-col items-center justify-center px-2 text-slate-700">
      <div className="w-8 h-px bg-slate-700" />
      <div className="-mr-1 text-slate-700 text-xs">▶</div>
    </div>
  )
}

interface DetailCardProps {
  title:    string
  body:     string
  accent:   string
}

function DetailCard({ title, body, accent }: DetailCardProps) {
  return (
    <div className="bg-[#0a0d18] border border-white/5 rounded-xl p-5">
      <div className="text-sm font-semibold mb-2" style={{ color: accent }}>{title}</div>
      <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
    </div>
  )
}

export function Architecture() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col gap-12">

      <div>
        <h1 className="text-2xl font-bold text-white mb-1">System Architecture</h1>
        <p className="text-slate-500 text-sm">
          Four components, two threads, zero mutexes on the hot path.
        </p>
      </div>

      {/* Flow diagram */}
      <div className="flex items-center">
        <FlowNode
          title="Kraken Exchange"
          subtitle="DATA SOURCE"
          chips={['wss://ws.kraken.com/v2', 'BTC/USD', 'depth=10', '~50 msg/s']}
          accent="#818cf8"
        />
        <Arrow />
        <FlowNode
          title="C++ LOB Engine"
          subtitle="CORE ENGINE"
          chips={['Boost.Beast WS', 'simdjson DOM', 'SPSC queue', 'flat array LOB', 'int64 ticks']}
          accent="#00dc82"
        />
        <Arrow />
        <FlowNode
          title="FastAPI Server"
          subtitle="BRIDGE"
          chips={['asyncio subprocess', 'WebSocket broadcast', '50ms tick', 'Python 3.12']}
          accent="#f59e0b"
        />
        <Arrow />
        <FlowNode
          title="React Frontend"
          subtitle="UI"
          chips={['React 18', 'Recharts', 'React Router', 'Tailwind', 'Vite']}
          accent="#ff4560"
        />
      </div>

      {/* How it works */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DetailCard
            accent="#818cf8"
            title="Price as int64_t ticks"
            body="Prices are stored as integer ticks (price × 1e8). Floating point equality is unreliable for keying price levels - 64179.30 stored as a double might not compare equal to another 64179.30 computed through a different path. Integer comparison is exact and faster."
          />
          <DetailCard
            accent="#00dc82"
            title="Sorted flat array over std::map"
            body="A flat sorted vector of 10-20 price levels fits entirely in L1 cache; binary search on 20 elements is ~3 comparisons. At this depth the measured apply() is within ~10% of std::map (see Performance) - so the flat array is chosen for cache-local top-of-book reads, zero per-update heap allocation, and flat latency, not a big-O win. A red-black tree would only pull ahead with thousands of levels."
          />
          <DetailCard
            accent="#00dc82"
            title="Lock-free SPSC queue"
            body="The network thread produces book updates; the main thread consumes them. A mutex would serialize both threads and add 50-200ns of contention per message. The SPSC ring buffer passes ownership with a single atomic store and a single atomic load - no locks, no contention, no false sharing (head and tail are on separate cache lines via alignas(64))."
          />
          <DetailCard
            accent="#f59e0b"
            title="simdjson DOM parser"
            body="Standard JSON parsers allocate on every parse call. simdjson validates and indexes the raw JSON bytes using SIMD instructions, then lets you traverse the structure without allocating. At Kraken's update rate the throughput difference is minimal, but it's the right habit for higher-frequency feeds like Binance (100+ msg/s)."
          />
          <DetailCard
            accent="#f59e0b"
            title="FastAPI subprocess bridge"
            body="The C++ binary runs in --web mode, emitting one JSON line to stdout every 50ms. The FastAPI server spawns it as an asyncio subprocess, reads each line, and fans it out to all connected browser WebSocket clients. The Python code is ~50 lines - it's genuinely just a thin broadcast proxy."
          />
          <DetailCard
            accent="#ff4560"
            title="React at 20 fps"
            body="The browser receives a WebSocket message every 50ms (~20 fps). React re-renders the order book and depth chart on each message. This is fast enough that the book feels live, and slow enough that the GPU doesn't overheat. The depth chart uses Recharts with step-interpolated area fills."
          />
        </div>
      </div>

      {/* Thread model */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Thread model</h2>
        <div className="bg-[#0a0d18] border border-white/5 rounded-xl p-6 font-mono text-sm">
          <div className="text-slate-500 mb-4 text-xs">C++ binary</div>
          <div className="flex gap-8">
            <div className="flex-1">
              <div className="text-mid text-xs mb-2">NETWORK THREAD</div>
              <div className="space-y-1 text-slate-300">
                <div>Boost.Beast WS read()</div>
                <div className="text-slate-600">↓</div>
                <div>simdjson parse_message()</div>
                <div className="text-slate-600">↓</div>
                <div>spsc_queue.push()</div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center text-slate-700 text-xs">
              <div>atomic</div>
              <div>store/load</div>
              <div>→</div>
            </div>
            <div className="flex-1">
              <div className="text-bid text-xs mb-2">MAIN THREAD</div>
              <div className="space-y-1 text-slate-300">
                <div>spsc_queue.pop()</div>
                <div className="text-slate-600">↓</div>
                <div>order_book.apply()</div>
                <div className="text-slate-600">↓</div>
                <div>printf JSON → stdout</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
