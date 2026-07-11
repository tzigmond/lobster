# LOBSTER
### Limit Order Book Streaming Terminal for Exchange Readout

A C++ limit order book connected to Kraken's live BTC/USD WebSocket feed, with a React web frontend and nanosecond-level benchmark story. The C++ engine (Boost.Beast + simdjson + lock-free SPSC queue + flat array LOB) outputs order book snapshots over a FastAPI WebSocket bridge to a browser UI featuring a live depth chart, animated order book, and performance comparison page.

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

- **Network thread** — `wss://ws.kraken.com/v2`, simdjson DOM parser, pushes `BookUpdate` structs into SPSC queue
- **Main thread** — drains queue, applies to flat array LOB, emits JSON line to stdout every 50ms
- **FastAPI bridge** — spawns C++ binary as asyncio subprocess, fans JSON lines out to all connected browser WebSocket clients
- **React frontend** — live depth chart (Recharts), animated order book with volume bars, architecture and performance pages
- **SPSC queue** — lock-free ring buffer, `alignas(64)` on head/tail, zero mutexes on hot path

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
# Full web stack — C++ engine + FastAPI bridge + React dev server
./start.sh
# then open http://localhost:5173

# Terminal UI (original)
./build/lobster --live BTC/USD

# Benchmark
./build/lob_bench --n 2000000
```

---

## Benchmark Results

| Operation | p50 | p95 | p99 | p99.9 |
|-----------|-----|-----|-----|-------|
| `apply()` — insert / update / delete | 32 ns | 32 ns | 64 ns | 128 ns |
| `best_bid() + best_ask()` — lookup | 16 ns | 16 ns | 16 ns | 16 ns |

2M operations, 50-level realistic depth, AMD Ryzen 7 3700X, `-O3 -march=native`.

---

## Key Design Decisions

**Price as `int64_t`** — prices stored as ticks (price × 1e8). Floating point equality is unreliable for price-level keying; integer comparison is exact and faster.

**Sorted flat array over `std::map`** — top 10–20 price levels fit in two cache lines. Binary search on 20 elements costs ~3 comparisons in L1 cache vs. pointer-chasing through a red-black tree at 70–100 ns per node access. p50 drops from ~200 ns to 32 ns.

**SPSC over mutex** — a mutex on the feed→book boundary adds 50–200 ns of contention per message. The SPSC ring buffer passes ownership with one atomic store and one atomic load, no locks, no false sharing.

**simdjson DOM parser** — the on-demand parser has a forward-only cursor that silently drops fields accessed out of order. The DOM parser has no ordering constraint and is simpler to reason about for nested object access.

## System Specs

| Component | Details |
|-----------|---------|
| CPU | AMD Ryzen 7 3700X (Zen 2, 8c/16t) |
| Memory | 32 GB DDR4 |
| OS | Windows 10 / WSL2 Ubuntu 24.04 |
| Compiler | g++ 13 (C++20), `-O3 -march=native` |
