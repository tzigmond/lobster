# LOBSTER
### Limit Order Book Streaming Terminal for Exchange Readout

A C++ limit order book that connects to Kraken's public WebSocket feed and maintains a live BTC/USD order book with nanosecond-level operation benchmarks. The core data structure is optimized in two stages — `std::map` baseline then a cache-friendly sorted flat array — with latency histograms (p50/p95/p99/p99.9) attributing each speedup to a specific hardware effect. A lock-free SPSC queue decouples the network feed thread from the book thread with no mutexes on the hot path. The whole thing renders live in a terminal UI showing bids, asks, spread, and a scrolling trade feed.

---

## Architecture

```
[Network Thread]                         [Main Thread]
WebSocket (Kraken)                       Order Book (LOB)
     ↓                                        ↑
JSON Parser (simdjson)  →→ SPSC Queue →→  Book Updater
                          (lock-free)
                                              ↓
                                         TUI Renderer (ftxui)
```

- **Network thread** — WebSocket connection to `wss://ws.kraken.com/v2`, parses JSON into `BookUpdate` structs, pushes into SPSC queue
- **Main thread** — drains the queue, applies updates to the order book, renders TUI at ~20 fps
- **SPSC queue** — single-producer single-consumer ring buffer, zero mutexes, `alignas(64)` on head/tail to prevent false sharing
- **Bench mode** — replaces the live feed with a synthetic generator; this is where nanosecond numbers come from

---

## Build

**Prerequisites**
```bash
sudo apt install libboost-all-dev libssl-dev cmake build-essential
```
simdjson and ftxui are fetched automatically by CMake.

**Compile**
```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j$(nproc)
```

**Run**
```bash
# Live mode — connects to Kraken, shows TUI
./build/lob_live --live BTC/USD

# Benchmark mode — synthetic feed, prints latency histogram
./build/lob_bench --n 1000000
```

---

## Results

| Stage | Insert p50 | Insert p99 | Lookup p50 | Data structure |
|-------|-----------|-----------|-----------|----------------|
| `std::map` baseline | TBD | TBD | TBD | Red-black tree |
| Sorted flat array | TBD | TBD | TBD | Cache-friendly array |

Full counter readings and histograms in [`results/benchmarks.md`](results/benchmarks.md).

---

## System Specs

| Component | Details |
|-----------|---------|
| CPU | AMD Ryzen 7 3700X (Zen 2, 8c/16t) |
| Memory | 32 GB DDR4 |
| OS | Windows 10 / WSL2 Ubuntu 24.04 |
| Compiler | g++ 13 (C++20) |

---

## Key Design Decisions

**Price as `int64_t`** — prices are stored as integer ticks (price × 1e8) rather than `double`. Floating point equality is unreliable for price-level keying; integer comparison is exact and faster.

**SPSC over mutex** — a mutex on the feed→book boundary would serialize the two threads and add 50–200 ns per message. The SPSC ring buffer passes updates with a single atomic store/load, keeping the book thread's hot path allocation-free.

**simdjson** — SIMD-accelerated JSON parser that operates on the raw message buffer without allocating. At Kraken's update rate this doesn't matter much, but at Binance rates (50–100 msg/s) it becomes meaningful, and it's the right habit.

**Sorted flat array over `std::map`** — a red-black tree pointer-chases through heap memory for every operation. A flat sorted array of price levels fits the top 10 levels in two cache lines and makes binary search dramatically cheaper. The benchmark numbers show this directly.
