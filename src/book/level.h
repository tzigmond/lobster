#pragma once
#include <cstdint>

enum class Side { BID, ASK };

// Price is stored as integer ticks (price * 1e8) to avoid floating point
// equality issues when keying price levels. qty remains double since
// fractional quantities don't need exact equality comparisons.
struct PriceLevel {
    int64_t price;  // ticks = real_price * 1e8
    double  qty;

    double real_price() const { return price / 1e8; }
};
