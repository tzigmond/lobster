#include "book/order_book.h"
#include "bench/latency_hist.h"
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <chrono>
#include <vector>
#include <random>

using Clock = std::chrono::high_resolution_clock;

static int64_t to_ticks(double price) {
    return static_cast<int64_t>(price * 1e8);
}

int main(int argc, char* argv[]) {
    int n = 1'000'000;
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--n") == 0 && i + 1 < argc)
            n = atoi(argv[++i]);
    }

    printf("lob_bench: %d operations\n\n", n);

    // Generate random update events
    std::mt19937 rng(42);
    std::uniform_real_distribution<double> price_dist(67000.0, 68000.0);
    std::uniform_real_distribution<double> qty_dist(0.0, 5.0);
    std::uniform_int_distribution<int>     side_dist(0, 1);

    struct Event { Side side; int64_t price; double qty; };
    std::vector<Event> events(n);
    for (auto& e : events) {
        e.side  = side_dist(rng) ? Side::BID : Side::ASK;
        e.price = to_ticks(price_dist(rng));
        // ~20% of events are deletions (qty=0)
        e.qty   = (qty_dist(rng) < 1.0) ? 0.0 : qty_dist(rng);
    }

    OrderBook book;
    LatencyHist insert_hist;
    LatencyHist lookup_hist;

    // Warmup
    for (int i = 0; i < std::min(n / 10, 10000); i++)
        book.apply(events[i].side, events[i].price, events[i].qty);
    book.clear();

    // Benchmark: apply
    printf("--- apply() latency (insert/update/delete) ---\n");
    for (int i = 0; i < n; i++) {
        auto t0 = Clock::now();
        book.apply(events[i].side, events[i].price, events[i].qty);
        auto t1 = Clock::now();
        insert_hist.record(std::chrono::duration_cast<std::chrono::nanoseconds>(t1 - t0).count());
    }
    insert_hist.print();

    // Benchmark: best_bid / best_ask lookup
    printf("--- best_bid() / best_ask() latency ---\n");
    for (int i = 0; i < n; i++) {
        auto t0 = Clock::now();
        auto bb = book.best_bid();
        auto ba = book.best_ask();
        auto t1 = Clock::now();
        lookup_hist.record(std::chrono::duration_cast<std::chrono::nanoseconds>(t1 - t0).count());
        (void)bb; (void)ba;  // prevent dead-code elimination
    }
    lookup_hist.print();

    // Print something from the book to prevent the whole thing being optimized away
    auto bb = book.best_bid();
    printf("best bid: $%.2f\n", bb.real_price());

    return 0;
}
