#pragma once
#include "level.h"
#include <vector>

class OrderBook {
public:
    void apply(Side side, int64_t price, double qty);  // qty==0 removes level
    PriceLevel best_bid() const;
    PriceLevel best_ask() const;
    double spread() const;
    std::vector<PriceLevel> top_bids(int n) const;
    std::vector<PriceLevel> top_asks(int n) const;
    void clear();

private:
    std::vector<PriceLevel> bids_;  // sorted descending (highest bid first)
    std::vector<PriceLevel> asks_;  // sorted ascending  (lowest ask first)

    static void apply_to(std::vector<PriceLevel>& levels, int64_t price, double qty, bool descending);
};
