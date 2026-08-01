#include "book/map_order_book.h"

// A price update is an insert, an in-place value change, or an erase. On a tree
// each of those is O(log n) plus a heap allocation / free on structural change.
static void apply_to(std::map<int64_t, double, std::greater<int64_t>>& m,
                     int64_t price, double qty) {
    if (qty == 0.0) m.erase(price);
    else            m[price] = qty;
}
static void apply_to(std::map<int64_t, double>& m, int64_t price, double qty) {
    if (qty == 0.0) m.erase(price);
    else            m[price] = qty;
}

void MapOrderBook::apply(Side side, int64_t price, double qty) {
    if (side == Side::BID) apply_to(bids_, price, qty);
    else                   apply_to(asks_, price, qty);
}

PriceLevel MapOrderBook::best_bid() const {
    return bids_.empty() ? PriceLevel{0, 0.0} : PriceLevel{bids_.begin()->first, bids_.begin()->second};
}

PriceLevel MapOrderBook::best_ask() const {
    return asks_.empty() ? PriceLevel{0, 0.0} : PriceLevel{asks_.begin()->first, asks_.begin()->second};
}

double MapOrderBook::spread() const {
    if (bids_.empty() || asks_.empty()) return 0.0;
    return (asks_.begin()->first - bids_.begin()->first) / 1e8;
}

std::vector<PriceLevel> MapOrderBook::top_bids(int n) const {
    std::vector<PriceLevel> out;
    for (auto& [p, q] : bids_) { if ((int)out.size() >= n) break; out.push_back({p, q}); }
    return out;
}

std::vector<PriceLevel> MapOrderBook::top_asks(int n) const {
    std::vector<PriceLevel> out;
    for (auto& [p, q] : asks_) { if ((int)out.size() >= n) break; out.push_back({p, q}); }
    return out;
}

void MapOrderBook::clear() {
    bids_.clear();
    asks_.clear();
}
