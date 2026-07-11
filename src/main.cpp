#include "book/order_book.h"
#include "feed/ws_client.h"
#include "tui/renderer.h"
#include "queue/spsc_queue.h"
#include <cstdio>
#include <cstring>
#include <string>
#include <thread>

static void print_usage() {
    fprintf(stderr, "usage:\n");
    fprintf(stderr, "  lob_live --live <SYMBOL>    connect to Kraken and show TUI\n");
}

int main(int argc, char* argv[]) {
    std::string symbol = "BTC/USD";
    bool live = false;

    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--live") == 0) {
            live = true;
            if (i + 1 < argc) symbol = argv[++i];
        }
    }

    if (!live) { print_usage(); return 1; }

    printf("lob_live: connecting to Kraken, symbol=%s\n", symbol.c_str());

    OrderBook     book;
    UpdateQueue   queue;
    WsClient      client(queue);

    // Feed thread: WebSocket → SPSC queue
    std::thread feed_thread([&]() { client.run(symbol); });

    // Main thread: drain queue → book → TUI
    run_tui(book, symbol);

    client.stop();
    feed_thread.join();
    return 0;
}
