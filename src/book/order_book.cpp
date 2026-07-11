#include "book/order_book.h"
#include <stdexcept>

void OrderBook::apply(Side side, int64_t price, double qty) {
    if (side == Side::BID) {
        if (qty == 0.0) bids_.erase(price);
        else            bids_[price] = qty;
    } else {
        if (qty == 0.0) asks_.erase(price);
        else            asks_[price] = qty;
    }
}

PriceLevel OrderBook::best_bid() const {
    if (bids_.empty()) return {0, 0.0};
    auto it = bids_.begin();
    return {it->first, it->second};
}

PriceLevel OrderBook::best_ask() const {
    if (asks_.empty()) return {0, 0.0};
    auto it = asks_.begin();
    return {it->first, it->second};
}

double OrderBook::spread() const {
    if (bids_.empty() || asks_.empty()) return 0.0;
    return (asks_.begin()->first - bids_.begin()->first) / 1e8;
}

std::vector<PriceLevel> OrderBook::top_bids(int n) const {
    std::vector<PriceLevel> out;
    out.reserve(n);
    for (auto it = bids_.begin(); it != bids_.end() && (int)out.size() < n; ++it)
        out.push_back({it->first, it->second});
    return out;
}

std::vector<PriceLevel> OrderBook::top_asks(int n) const {
    std::vector<PriceLevel> out;
    out.reserve(n);
    for (auto it = asks_.begin(); it != asks_.end() && (int)out.size() < n; ++it)
        out.push_back({it->first, it->second});
    return out;
}

void OrderBook::clear() {
    bids_.clear();
    asks_.clear();
}
