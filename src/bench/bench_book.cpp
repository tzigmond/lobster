#include "book/order_book.h"
#include "book/map_order_book.h"
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <random>
#include <vector>
#include <algorithm>

using Clock = std::chrono::steady_clock;

// Why batched timing instead of a per-operation histogram:
// apply() runs in ~10-30 ns. A single std::chrono::now() pair costs ~15-25 ns on
// this host, so wrapping one call measures the clock more than the operation, and
// the result quantizes to the timer's resolution. Instead we time a whole stream
// of N operations with ONE clock pair and divide: the fixed clock overhead is
// amortized to near zero and the number is a real mean ns/op. We run several
// trials and report the minimum (least noise) and the median.

static constexpr double MID_PRICE = 67000.0;
static constexpr double TICK_SIZE = 0.10;   // $0.10 per tick
static constexpr int    DEPTH     = 50;     // seeded levels per side

static int64_t to_ticks(double price) {
    return static_cast<int64_t>(price * 1e8 + 0.5);
}

struct Event { Side side; int64_t price; double qty; };

// Steady-state: every event hits one of the DEPTH pre-seeded levels - mostly
// in-place qty updates with ~10% deletes/re-inserts. This is what a live L2 book
// looks like second to second.
static std::vector<Event> makeSteadyState(int n, const std::vector<int64_t>& bid_p,
                                           const std::vector<int64_t>& ask_p) {
    std::mt19937 rng(42);
    std::uniform_int_distribution<int>     side_d(0, 1);
    std::uniform_int_distribution<int>     level_d(0, DEPTH - 1);
    std::uniform_real_distribution<double> qty_d(0.01, 5.0);
    std::uniform_real_distribution<double> del_d(0.0, 1.0);
    std::vector<Event> ev(n);
    for (auto& e : ev) {
        e.side  = side_d(rng) ? Side::BID : Side::ASK;
        auto& p = (e.side == Side::BID) ? bid_p : ask_p;
        e.price = p[level_d(rng)];
        e.qty   = (del_d(rng) < 0.1) ? 0.0 : qty_d(rng);
    }
    return ev;
}

// Insert-heavy: ~40% of events introduce a brand-new price level away from the
// seeded band, forcing the flat array to memmove elements (and the tree to
// allocate a node). This exercises the O(n)-shift path the steady-state workload
// never touches, so the label "insert / update / delete" is honest.
static std::vector<Event> makeInsertHeavy(int n, const std::vector<int64_t>& bid_p,
                                          const std::vector<int64_t>& ask_p) {
    std::mt19937 rng(7);
    std::uniform_int_distribution<int>     side_d(0, 1);
    std::uniform_int_distribution<int>     level_d(0, DEPTH - 1);
    std::uniform_int_distribution<int>     new_lvl(0, 400);
    std::uniform_real_distribution<double> qty_d(0.01, 5.0);
    std::uniform_real_distribution<double> kind_d(0.0, 1.0);
    std::vector<Event> ev(n);
    for (auto& e : ev) {
        e.side = side_d(rng) ? Side::BID : Side::ASK;
        auto& p = (e.side == Side::BID) ? bid_p : ask_p;
        double k = kind_d(rng);
        if (k < 0.40) {
            // Insert a new level deeper than the seeded band (forces a shift).
            double off = (DEPTH + 1 + new_lvl(rng)) * TICK_SIZE;
            e.price = (e.side == Side::BID) ? to_ticks(MID_PRICE - off)
                                            : to_ticks(MID_PRICE + off);
            e.qty   = qty_d(rng);
        } else if (k < 0.55) {
            e.price = p[level_d(rng)];      // delete an existing seeded level
            e.qty   = 0.0;
        } else {
            e.price = p[level_d(rng)];      // update an existing seeded level
            e.qty   = qty_d(rng);
        }
    }
    return ev;
}

static double calibrateClockNs() {
    // Cost of one now()..now() pair, so we can state it honestly.
    const int R = 2'000'000;
    volatile long long acc = 0;
    auto t0 = Clock::now();
    for (int i = 0; i < R; ++i) { auto a = Clock::now(); acc += a.time_since_epoch().count(); }
    auto t1 = Clock::now();
    return std::chrono::duration<double, std::nano>(t1 - t0).count() / R;
}

// Time the whole event stream once; return mean ns per apply().
template <class Book>
static double timeApply(Book& book, const std::vector<Event>& ev) {
    auto t0 = Clock::now();
    for (const auto& e : ev) book.apply(e.side, e.price, e.qty);
    auto t1 = Clock::now();
    return std::chrono::duration<double, std::nano>(t1 - t0).count() / ev.size();
}

// Time N best_bid()+best_ask() lookups; return mean ns per lookup pair.
template <class Book>
static double timeLookup(const Book& book, int n, volatile int64_t& sink) {
    auto t0 = Clock::now();
    for (int i = 0; i < n; ++i) sink += book.best_bid().price + book.best_ask().price;
    auto t1 = Clock::now();
    return std::chrono::duration<double, std::nano>(t1 - t0).count() / n;
}

template <class Book>
static void seed(Book& book, const std::vector<int64_t>& bid_p,
                 const std::vector<int64_t>& ask_p) {
    for (auto p : bid_p) book.apply(Side::BID, p, 1.0);
    for (auto p : ask_p) book.apply(Side::ASK, p, 1.0);
}

struct Result { double apply_best, apply_med, lookup_best, lookup_med; };

// Fresh book per trial so insert-heavy runs don't accumulate an ever-growing book
// across trials. Reports best (least-noise) and median of the per-trial means.
template <class Book>
static Result run(const std::vector<Event>& ev, const std::vector<int64_t>& bid_p,
                  const std::vector<int64_t>& ask_p, int trials) {
    std::vector<double> ap, lk;
    volatile int64_t sink = 0;
    for (int t = 0; t < trials; ++t) {
        Book book;
        seed(book, bid_p, ask_p);
        ap.push_back(timeApply(book, ev));
        lk.push_back(timeLookup(book, (int)ev.size(), sink));
    }
    std::sort(ap.begin(), ap.end());
    std::sort(lk.begin(), lk.end());
    return { ap.front(), ap[ap.size()/2], lk.front(), lk[lk.size()/2] };
}

int main(int argc, char* argv[]) {
    int n = 2'000'000, trials = 7;
    for (int i = 1; i < argc; i++) {
        if (!strcmp(argv[i], "--n")      && i+1 < argc) n      = atoi(argv[++i]);
        if (!strcmp(argv[i], "--trials") && i+1 < argc) trials = atoi(argv[++i]);
    }

    std::vector<int64_t> bid_p, ask_p;
    for (int i = 0; i < DEPTH; i++) {
        bid_p.push_back(to_ticks(MID_PRICE - (i + 1) * TICK_SIZE));
        ask_p.push_back(to_ticks(MID_PRICE + (i + 1) * TICK_SIZE));
    }

    double clk = calibrateClockNs();
    printf("lob_bench: %d ops/trial, %d trials, depth=%d levels/side\n", n, trials, DEPTH);
    printf("clock: one steady_clock::now() pair costs ~%.1f ns on this host\n", clk);
    printf("method: batched - time the full stream, divide by op count (mean ns/op)\n\n");

    struct Row { const char* workload; const char* ds; Result r; };
    std::vector<Row> rows;

    {
        auto ev = makeSteadyState(n, bid_p, ask_p);
        rows.push_back({"steady-state", "flat array", run<OrderBook>(ev, bid_p, ask_p, trials)});
        rows.push_back({"steady-state", "std::map",   run<MapOrderBook>(ev, bid_p, ask_p, trials)});
    }
    {
        auto ev = makeInsertHeavy(n, bid_p, ask_p);
        rows.push_back({"insert-heavy", "flat array", run<OrderBook>(ev, bid_p, ask_p, trials)});
        rows.push_back({"insert-heavy", "std::map",   run<MapOrderBook>(ev, bid_p, ask_p, trials)});
    }

    printf("%-14s %-11s %12s %12s %12s %12s\n",
           "workload", "structure", "apply best", "apply med", "lookup best", "lookup med");
    printf("%-14s %-11s %12s %12s %12s %12s\n",
           "--------", "---------", "----------", "---------", "-----------", "----------");
    for (auto& row : rows)
        printf("%-14s %-11s %10.1f ns %10.1f ns %10.1f ns %10.1f ns\n",
               row.workload, row.ds, row.r.apply_best, row.r.apply_med,
               row.r.lookup_best, row.r.lookup_med);

    // Speedup (best apply, flat vs map) per workload.
    printf("\nflat-array apply() speedup vs std::map (best-of-%d):\n", trials);
    printf("  steady-state: %.1fx    insert-heavy: %.1fx\n",
           rows[1].r.apply_best / rows[0].r.apply_best,
           rows[3].r.apply_best / rows[2].r.apply_best);
    return 0;
}
