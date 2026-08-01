#pragma once
#include "book/level.h"
#include <vector>
#include <string>

// A parsed update from the Kraken WebSocket feed.
// One BookUpdate may contain many level changes (snapshot or diff).
struct LevelUpdate {
    Side    side;
    int64_t price;  // ticks
    double  qty;    // 0 = delete level
};

struct BookUpdate {
    bool is_snapshot = false;
    std::vector<LevelUpdate> levels;
};

// TODO (stage 6): replace stub with simdjson on-demand parser
//
// Kraken v2 sends two message types:
//   snapshot: {"channel":"book","type":"snapshot","data":[{"symbol":"BTC/USD",
//              "bids":[{"price":67840.0,"qty":1.243},...], "asks":[...]}]}
//   update:   {"channel":"book","type":"update","data":[{"symbol":"BTC/USD",
//              "bids":[...],"asks":[...]}]}
//
// Use simdjson's on-demand API to parse without allocating.
// Convert price doubles to int64_t ticks via (int64_t)(price * 1e8).
// qty == 0.0 in a Kraken update means the level was removed.
//
// Ref: Kraken WebSocket API v2 docs
// Ref: simdjson on-demand docs - https://github.com/simdjson/simdjson

BookUpdate parse_message(const std::string& raw_json);
