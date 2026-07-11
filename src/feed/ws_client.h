#pragma once
#include "feed/parser.h"
#include "queue/spsc_queue.h"
#include <string>
#include <functional>

// TODO (stage 5): implement Boost.Beast async WebSocket client
//
// Connects to wss://ws.kraken.com/v2 and subscribes to the BTC/USD L2 book.
// Runs on its own thread. On each message, parses JSON and pushes a BookUpdate
// into the SPSC queue for the main thread to consume.
//
// Subscribe message:
//   {"method":"subscribe","params":{"channel":"book","symbol":["BTC/USD"],"depth":10}}
//
// Reconnects automatically on disconnect.
//
// Ref: Boost.Beast WebSocket client example (async, SSL)

using UpdateQueue = SPSCQueue<BookUpdate, 1024>;

class WsClient {
public:
    explicit WsClient(UpdateQueue& queue) : queue_(queue) {}

    // Blocks until stop() is called
    void run(const std::string& symbol);
    void stop();

private:
    UpdateQueue& queue_;
    bool running_ = false;
};
