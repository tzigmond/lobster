#include "book/order_book.h"
#include <algorithm>

// Binary search into a sorted vector, insert/update/delete in place.
// For bids (descending): lower_bound finds first element where !(lvl.price > p),
// i.e. first element <= p. For asks (ascending): finds first element >= p.
void OrderBook::apply_to(std::vector<PriceLevel>& levels, int64_t price, double qty, bool descending) {
    auto it = std::lower_bound(levels.begin(), levels.end(), price,
        [descending](const PriceLevel& lvl, int64_t p) {
            return descending ? lvl.price > p : lvl.price < p;
        });

    if (it != levels.end() && it->price == price) {
        if (qty == 0.0) levels.erase(it);
        else            it->qty = qty;
    } else if (qty > 0.0) {
        levels.insert(it, {price, qty});
    }
}

void OrderBook::apply(Side side, int64_t price, double qty) {
    if (side == Side::BID) apply_to(bids_, price, qty, true);
    else                   apply_to(asks_, price, qty, false);
}

PriceLevel OrderBook::best_bid() const {
    return bids_.empty() ? PriceLevel{0, 0.0} : bids_.front();
}

PriceLevel OrderBook::best_ask() const {
    return asks_.empty() ? PriceLevel{0, 0.0} : asks_.front();
}

double OrderBook::spread() const {
    if (bids_.empty() || asks_.empty()) return 0.0;
    return (asks_.front().price - bids_.front().price) / 1e8;
}

std::vector<PriceLevel> OrderBook::top_bids(int n) const {
    int count = std::min(n, (int)bids_.size());
    return {bids_.begin(), bids_.begin() + count};
}

std::vector<PriceLevel> OrderBook::top_asks(int n) const {
    int count = std::min(n, (int)asks_.size());
    return {asks_.begin(), asks_.begin() + count};
}

void OrderBook::clear() {
    bids_.clear();
    asks_.clear();
}
