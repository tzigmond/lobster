#include "feed/parser.h"
#include <simdjson.h>
#include <cstdio>

// Thread-local parser reuses internal buffers across calls — no per-call allocation.
static thread_local simdjson::ondemand::parser sjparser;

BookUpdate parse_message(const std::string& raw) {
    BookUpdate update;

    try {
        // padded_string copies once into a buffer with SIMDJSON_PADDING bytes after content.
        // The on-demand parser then works zero-copy from that buffer.
        simdjson::padded_string ps(raw.data(), raw.size());
        auto doc = sjparser.iterate(ps);

        std::string_view channel;
        if (doc["channel"].get(channel) != simdjson::SUCCESS || channel != "book")
            return update;  // heartbeat, subscription confirm, etc.

        std::string_view type;
        if (doc["type"].get(type) != simdjson::SUCCESS)
            return update;

        update.is_snapshot = (type == "snapshot");

        for (auto item : doc["data"].get_array()) {
            for (auto bid : item["bids"].get_array()) {
                double price = 0, qty = 0;
                bid["price"].get(price);
                bid["qty"].get(qty);
                // +0.5 before truncation to handle floating point rounding
                update.levels.push_back({Side::BID, (int64_t)(price * 1e8 + 0.5), qty});
            }
            for (auto ask : item["asks"].get_array()) {
                double price = 0, qty = 0;
                ask["price"].get(price);
                ask["qty"].get(qty);
                update.levels.push_back({Side::ASK, (int64_t)(price * 1e8 + 0.5), qty});
            }
        }
    } catch (const simdjson::simdjson_error& e) {
        fprintf(stderr, "[parser] JSON error: %s\n", e.what());
    }

    return update;
}
