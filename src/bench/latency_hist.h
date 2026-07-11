#pragma once
#include <cstdint>
#include <cstdio>
#include <array>
#include <algorithm>
#include <vector>

// Records latencies in nanoseconds into power-of-2 buckets (1ns, 2ns, 4ns, ..., 2^31 ns).
// Reports p50, p95, p99, p99.9 from the bucket distribution.
class LatencyHist {
public:
    static constexpr int BUCKETS = 32;

    void record(int64_t ns) {
        if (ns <= 0) ns = 1;
        int bucket = 0;
        int64_t v = ns;
        while (v > 1 && bucket < BUCKETS - 1) { v >>= 1; bucket++; }
        counts_[bucket]++;
        total_++;
    }

    void print() const {
        printf("  %-12s  %s\n", "Latency", "Count");
        printf("  %-12s  %s\n", "-------", "-----");
        for (int i = 0; i < BUCKETS; i++) {
            if (counts_[i] == 0) continue;
            int64_t lo = (i == 0) ? 0 : (int64_t(1) << (i - 1));
            int64_t hi = int64_t(1) << i;
            printf("  %4lld–%-6lld ns  %lld\n", (long long)lo, (long long)hi, (long long)counts_[i]);
        }
        printf("\n");
        printf("  p50  : %lld ns\n", (long long)percentile(0.50));
        printf("  p95  : %lld ns\n", (long long)percentile(0.95));
        printf("  p99  : %lld ns\n", (long long)percentile(0.99));
        printf("  p99.9: %lld ns\n", (long long)percentile(0.999));
    }

private:
    std::array<int64_t, BUCKETS> counts_{};
    int64_t total_ = 0;

    int64_t percentile(double p) const {
        int64_t target = (int64_t)(total_ * p);
        int64_t cum = 0;
        for (int i = 0; i < BUCKETS; i++) {
            cum += counts_[i];
            if (cum >= target)
                return int64_t(1) << i;
        }
        return int64_t(1) << (BUCKETS - 1);
    }
};
