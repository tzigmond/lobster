# Benchmark Results

Hardware: AMD Ryzen 7 3700X (Zen 2, 8c/16t) | 32 GB DDR4 | WSL2 Ubuntu 24.04
Compiler: g++ 13, -O3 -march=native | 1,000,000 operations per run

---

## Operation Latency

| Stage | Insert p50 | Insert p99 | Lookup p50 | Data structure |
|-------|-----------|-----------|-----------|----------------|
| `std::map` baseline | TBD | TBD | TBD | Red-black tree |
| Sorted flat array | TBD | TBD | TBD | Cache-friendly array |

---

## Stage 1 — `std::map` baseline

```
apply() latency:
  p50  :
  p95  :
  p99  :
  p99.9:

best_bid() / best_ask() latency:
  p50  :
  p95  :
  p99  :
  p99.9:
```

Notes:

---

## Stage 3 — Sorted flat array

```
apply() latency:
  p50  :
  p95  :
  p99  :
  p99.9:

best_bid() / best_ask() latency:
  p50  :
  p95  :
  p99  :
  p99.9:
```

Notes:
