#include "feed/parser.h"
#include <simdjson.h>
#include <cstdio>

// DOM parser: no forward-only cursor — fields can be accessed in any order.
// The on-demand parser's strict ordering requirement was silently dropping "asks"
// once the cursor advanced past that position, causing the crossed-book bug.
static thread_local simdjson::dom::parser dparser;

BookUpdate parse_message(const std::string& raw) {
    BookUpdate update;
    try {
        simdjson::dom::element doc = dparser.parse(raw);

        if (std::string_view(doc["channel"].get_string()) != "book")
            return update;

        std::string_view type = doc["type"].get_string();
        update.is_snapshot = (type == "snapshot");

        for (simdjson::dom::element item : doc["data"].get_array()) {
            for (simdjson::dom::element bid : item["bids"].get_array()) {
                double price = bid["price"].get_double();
                double qty   = bid["qty"].get_double();
                update.levels.push_back({Side::BID, (int64_t)(price * 1e8 + 0.5), qty});
            }
            for (simdjson::dom::element ask : item["asks"].get_array()) {
                double price = ask["price"].get_double();
                double qty   = ask["qty"].get_double();
                update.levels.push_back({Side::ASK, (int64_t)(price * 1e8 + 0.5), qty});
            }
        }
    } catch (const simdjson::simdjson_error& e) {
        fprintf(stderr, "[parser] error: %s\n", e.what());
    }
    return update;
}
