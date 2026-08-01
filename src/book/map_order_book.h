#pragma once
#include "level.h"
#include <map>
#include <vector>
#include <functional>

// Red-black-tree order book: the baseline the flat-array book is measured
// against. Bids in a map sorted descending (std::greater), asks ascending, so
// best_bid()/best_ask() are both begin(). Same public interface as OrderBook,
// and compiled in its own translation unit so the apply()/lookup calls cross the
// same function-call boundary the flat-array book does - a fair comparison, not
// one side inlined and the other not.
class MapOrderBook {
public:
    void apply(Side side, int64_t price, double qty);  // qty==0 removes level
    PriceLevel best_bid() const;
    PriceLevel best_ask() const;
    double spread() const;
    std::vector<PriceLevel> top_bids(int n) const;
    std::vector<PriceLevel> top_asks(int n) const;
    void clear();

private:
    std::map<int64_t, double, std::greater<int64_t>> bids_;  // highest first
    std::map<int64_t, double>                        asks_;  // lowest first
};
