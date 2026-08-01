# Benchmark Results

Hardware: Intel Core Ultra 7 155H (Meteor Lake, AVX2 + FMA3) | 16 GB | WSL2 Ubuntu 24.04
Compiler: g++ 13.3, `-O3 -march=native` | 2,000,000 ops/trial, best & median of 9 trials

Reproduce:
```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j$(nproc) --target lob_bench
./build/lob_bench --n 2000000 --trials 9
```

---

## Method

Each `apply()` runs in tens of nanoseconds. A single `steady_clock::now()` pair
costs **~17 ns** on this host, so timing one call measures the clock, not the
operation, and quantizes the result to timer resolution. (An earlier version of
this benchmark did exactly that and reported everything in power-of-2 buckets;
those numbers were an artifact of the timer, not the book.)

Instead we time the **whole stream** of N operations with one clock pair and
divide, so the fixed clock cost amortizes to near zero and the result is a real
mean ns/op. We run 9 trials and report the minimum (least noise) and the median.

Two workloads:
- **steady-state** - every event hits one of 50 pre-seeded levels; ~90% in-place
  qty updates, ~10% delete/re-insert. What a live L2 book looks like second to
  second at a `depth:10` subscription.
- **insert-heavy** - ~40% of events insert a brand-new level deeper than the
  seeded band, forcing the flat array to memmove and the tree to allocate. This
  deliberately exercises the O(n)-shift path steady-state never touches.

---

## Results (mean ns/op)

| Workload | Structure | apply() best | apply() median | lookup best | lookup median |
|----------|-----------|-------------|----------------|-------------|---------------|
| steady-state | Sorted flat array | 32.8 | 33.6 | 1.4 | 1.5 |
| steady-state | `std::map` (red-black tree) | 36.2 | 38.3 | 1.2 | 1.2 |
| insert-heavy | Sorted flat array | 50.8 | 51.7 | 1.4 | 1.7 |
| insert-heavy | `std::map` (red-black tree) | 50.3 | 57.1 | 1.3 | 1.7 |

`lookup` = `best_bid()` + `best_ask()` (one call each).

---

## What this actually shows

The honest result is **not** a headline speed multiple. At top-of-book depth
(10-50 levels) the sorted flat array and `std::map` are within ~10% on `apply()`,
and on the insert-heavy workload they trade places. That is expected: with n this
small, O(log n) vs O(n) barely differs, and the array's memmove competes with the
tree's per-node allocation.

Where the flat array genuinely wins is not raw `apply()` throughput but:

- **No per-update heap allocation.** `std::map` calls `operator new`/`delete` on
  every structural change (insert/erase). The flat array reuses its buffer. Under
  sustained churn this means no allocator pressure and no fragmentation, which
  shows up in the tail, not the mean.
- **Cache-local top-of-book reads.** `top_bids(20)`/`top_asks(20)` - the hot path
  that feeds the UI 20x/second - walks contiguous memory (~2 cache lines) instead
  of pointer-chasing tree nodes.
- **Flat, predictable latency.** No tree rebalance, so no occasional expensive
  insert.

And it wins *because the live feed caps depth* (`ws_client` subscribes
`depth:10`), keeping n in the range where the array ties or beats the tree. If the
book needed thousands of levels, the tree would be the right call.

So the flat array is the correct choice here for locality, allocation behavior,
and latency predictability - not because it is several times faster at this depth.
Keeping this as a measured, roughly-even result rather than inventing a multiple.
