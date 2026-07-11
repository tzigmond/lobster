#include "book/order_book.h"
#include "feed/ws_client.h"
#include "tui/renderer.h"
#include <cstdio>
#include <cstring>
#include <thread>

static void usage() {
    fprintf(stderr, "usage: lobster --live <SYMBOL>\n");
    fprintf(stderr, "  example: lobster --live BTC/USD\n");
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

    if (!live) { usage(); return 1; }

    OrderBook   book;
    UpdateQueue queue;
    WsClient    client(queue);

    // Feed thread: WebSocket → parse → SPSC queue
    std::thread feed_thread([&] { client.run(symbol); });

    // Main thread: drain queue → book → TUI (all three on same thread, no locks needed)
    run_tui(book, queue, symbol);

    // TUI exited (user pressed Q) — stop feed thread and wait
    client.stop();
    feed_thread.join();

    return 0;
}
