#pragma once
#include "level.h"
#include <map>
#include <vector>

class OrderBook {
public:
    // Apply a level update. qty == 0 means remove the level.
    void apply(Side side, int64_t price, double qty);

    PriceLevel best_bid() const;
    PriceLevel best_ask() const;
    double     spread()   const;

    // Top n levels, bids descending, asks ascending
    std::vector<PriceLevel> top_bids(int n) const;
    std::vector<PriceLevel> top_asks(int n) const;

    void clear();

private:
    // Bids: highest price = best, so reverse comparator
    std::map<int64_t, double, std::greater<int64_t>> bids_;
    // Asks: lowest price = best, default ascending
    std::map<int64_t, double> asks_;
};
