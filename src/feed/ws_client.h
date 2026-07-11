#pragma once
#include "feed/parser.h"
#include "queue/spsc_queue.h"
#include <atomic>
#include <string>

using UpdateQueue = SPSCQueue<BookUpdate, 1024>;

class WsClient {
public:
    explicit WsClient(UpdateQueue& queue) : queue_(queue) {}

    void run(const std::string& symbol);  // blocks until stop() is called
    void stop();

private:
    UpdateQueue&          queue_;
    std::atomic<bool>     running_{false};
};
