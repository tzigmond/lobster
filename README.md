# LOBSTER
### Limit Order Book Streaming Terminal for Exchange Readout

A C++ limit order book connected to Kraken's live BTC/USD WebSocket feed, with a React web frontend and a measured latency comparison against a `std::map` baseline. The C++ engine (Boost.Beast + simdjson + lock-free SPSC queue + flat array LOB) outputs order book snapshots over a FastAPI WebSocket bridge to a browser UI featuring a live depth chart, animated order book, and performance comparison page.

---

## Architecture

```
[Network Thread]                         [Main Thread]
WebSocket (Kraken)                       Order Book (LOB)
     ↓                                        ↑
JSON Parser (simdjson)  →→ SPSC Queue →→  Book Updater
                          (lock-free)          ↓
                                        JSON → stdout
                                               ↓
                                        FastAPI (Python)
                                               ↓
                                        React browser UI
```

- **Network thread** - `wss://ws.kraken.com/v2`, simdjson DOM parser, pushes `BookUpdate` structs into SPSC queue
- **Main thread** - drains queue, applies to flat array LOB, emits JSON line to stdout every 50ms
- **FastAPI bridge** - spawns C++ binary as asyncio subprocess, fans JSON lines out to all connected browser WebSocket clients
- **React frontend** - live depth chart (Recharts), animated order book with volume bars, architecture and performance pages
- **SPSC queue** - lock-free ring buffer, `alignas(64)` on head/tail, zero mutexes on hot path

---

## Build

**Prerequisites**
```bash
sudo apt install libboost-all-dev libssl-dev cmake build-essential python3-venv nodejs npm
```
simdjson and ftxui are fetched by CMake at configure time.

**C++ engine**
```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j$(nproc)
```

**Web dependencies** (first time only)
```bash
python3 -m venv server/.venv
server/.venv/bin/pip install -r server/requirements.txt
cd web && npm install
```

---

## Run

```bash
# Full web stack - C++ engine + FastAPI bridge + React dev server
./start.sh
# then open http://localhost:5173

# Terminal UI (original)
./build/lobster --live BTC/USD

# Benchmark
./build/lob_bench --n 2000000
```

---

## Benchmark Results

Mean ns/op, timed by the whole stream (see method note below), best & median of
9 trials, 2M ops/trial at 50-level depth. Flat array vs a `std::map` (red-black
tree) baseline measured in the same run.

| Workload | Structure | apply() best | apply() median | lookup best/median |
|----------|-----------|-------------|----------------|--------------------|
| steady-state | Sorted flat array | 32.8 ns | 33.6 ns | 1.4 / 1.5 ns |
| steady-state | `std::map` | 36.2 ns | 38.3 ns | 1.2 / 1.2 ns |
| insert-heavy | Sorted flat array | 50.8 ns | 51.7 ns | 1.4 / 1.7 ns |
| insert-heavy | `std::map` | 50.3 ns | 57.1 ns | 1.3 / 1.7 ns |

**Method:** `apply()` runs in tens of ns, but one `steady_clock::now()` pair costs
~17 ns on this host, so timing a single call measures the clock. Instead the whole
N-op stream is timed with one clock pair and divided (real mean ns/op). `lookup` =
`best_bid()` + `best_ask()`.

**Read `apply()`, not `lookup`.** The `apply()` number is meaningful: it runs over
2M distinct events with data-dependent binary-search branching. The `lookup`
number is close to meaningless as a latency because the loop reads the same
unchanged top-of-book every iteration, which the CPU pipelines to near-nothing; it
only really confirms the read is O(1) and trivially cheap.

**What it shows:** at top-of-book depth the flat array and `std::map` are within
~10% on `apply()` and trade places under heavy inserts - with n this small,
O(log n) vs O(n) barely differs. The flat array's real advantages are no per-update
heap allocation, cache-local top-of-book reads, and flat latency, not a headline
multiple. Absolute numbers swing a couple ns between runs on a laptop, so read the
comparison, not the exact digits. Full analysis and reproduction steps in
[`results/benchmarks.md`](results/benchmarks.md).

---

## Key Design Decisions

**Price as `int64_t`** - prices stored as ticks (price × 1e8). Floating point equality is unreliable for price-level keying; integer comparison is exact and faster.

**Sorted flat array over `std::map`** - top 10-20 price levels fit in two cache lines, and the live feed caps depth (`depth:10`), so n stays small. At that size the flat array and a red-black tree are within ~10% on `apply()` (measured, see benchmarks), so this isn't a big-O win - it's chosen for cache-local top-of-book scans, zero per-update heap allocation, and flat, predictable latency. A tree would only pull ahead if the book needed thousands of levels.

**SPSC over mutex** - a mutex on the feed→book boundary adds 50-200 ns of contention per message. The SPSC ring buffer passes ownership with one atomic store and one atomic load, no locks, no false sharing.

**simdjson DOM parser** - the on-demand parser has a forward-only cursor that silently drops fields accessed out of order. The DOM parser has no ordering constraint and is simpler to reason about for nested object access.

## System Specs

| Component | Details |
|-----------|---------|
| CPU | Intel Core Ultra 7 155H (Meteor Lake, AVX2 + FMA3) |
| Memory | 16 GB |
| OS | WSL2 Ubuntu 24.04 |
| Compiler | g++ 13.3 (C++20), `-O3 -march=native` |
