#include "book/order_book.h"
#include "bench/latency_hist.h"
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <random>
#include <vector>

using Clock = std::chrono::high_resolution_clock;

// Realistic price levels: mid-price with tight spread, 50 levels each side.
// This matches what a real top-of-book looks like: ~50 price levels within
// a few dollars of the mid, not random prices across a $1000 range.
static constexpr double MID_PRICE  = 67000.0;
static constexpr double TICK_SIZE  = 0.10;   // $0.10 per tick
static constexpr int    DEPTH      = 50;     // levels per side

static int64_t to_ticks(double price) {
    return static_cast<int64_t>(price * 1e8 + 0.5);
}

int main(int argc, char* argv[]) {
    int n = 1'000'000;
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--n") == 0 && i + 1 < argc)
            n = atoi(argv[++i]);
    }

    printf("lob_bench: %d operations, depth=%d levels/side\n\n", n, DEPTH);

    // Pre-build a realistic set of bid and ask price levels
    std::vector<int64_t> bid_prices, ask_prices;
    for (int i = 0; i < DEPTH; i++) {
        bid_prices.push_back(to_ticks(MID_PRICE - (i + 1) * TICK_SIZE));
        ask_prices.push_back(to_ticks(MID_PRICE + (i + 1) * TICK_SIZE));
    }

    // Generate events: mostly updates to existing levels (~80%), some inserts/deletes (~20%)
    std::mt19937 rng(42);
    std::uniform_int_distribution<int>    side_d(0, 1);
    std::uniform_int_distribution<int>    level_d(0, DEPTH - 1);
    std::uniform_real_distribution<double> qty_d(0.01, 5.0);
    std::uniform_real_distribution<double> delete_d(0.0, 1.0);

    struct Event { Side side; int64_t price; double qty; };
    std::vector<Event> events(n);
    for (auto& e : events) {
        e.side  = side_d(rng) ? Side::BID : Side::ASK;
        auto& prices = (e.side == Side::BID) ? bid_prices : ask_prices;
        e.price = prices[level_d(rng)];
        e.qty   = (delete_d(rng) < 0.1) ? 0.0 : qty_d(rng);  // 10% deletions
    }

    OrderBook book;
    LatencyHist apply_hist, lookup_hist;

    // Seed the book with all levels so we're benchmarking steady-state updates
    for (auto p : bid_prices) book.apply(Side::BID, p, 1.0);
    for (auto p : ask_prices) book.apply(Side::ASK, p, 1.0);

    // Warmup
    for (int i = 0; i < std::min(n / 10, 10000); i++)
        book.apply(events[i].side, events[i].price, events[i].qty);

    // Benchmark: apply()
    printf("--- apply() latency ---\n");
    for (int i = 0; i < n; i++) {
        auto t0 = Clock::now();
        book.apply(events[i].side, events[i].price, events[i].qty);
        auto t1 = Clock::now();
        apply_hist.record(std::chrono::duration_cast<std::chrono::nanoseconds>(t1 - t0).count());
    }
    apply_hist.print();

    // Benchmark: best_bid() + best_ask()
    printf("--- best_bid() + best_ask() latency ---\n");
    volatile int64_t sink = 0;
    for (int i = 0; i < n; i++) {
        auto t0 = Clock::now();
        sink += book.best_bid().price + book.best_ask().price;
        auto t1 = Clock::now();
        lookup_hist.record(std::chrono::duration_cast<std::chrono::nanoseconds>(t1 - t0).count());
    }
    lookup_hist.print();

    printf("best bid: $%.2f  best ask: $%.2f  spread: $%.2f\n",
           book.best_bid().real_price(),
           book.best_ask().real_price(),
           book.spread());
    printf("(sink=%lld)\n", (long long)sink);  // prevent dead-code elimination

    return 0;
}
