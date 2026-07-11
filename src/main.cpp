#include "book/order_book.h"
#include "feed/ws_client.h"
#include "tui/renderer.h"
#include <chrono>
#include <csignal>
#include <cstdio>
#include <cstring>
#include <thread>

static void usage() {
    fprintf(stderr, "usage:\n");
    fprintf(stderr, "  lobster --live <SYMBOL>   terminal UI\n");
    fprintf(stderr, "  lobster --web  <SYMBOL>   JSON stdout (for web server)\n");
}

static volatile bool g_web_running = true;
static void sig_handler(int) { g_web_running = false; }

static void run_web(OrderBook& book, UpdateQueue& queue) {
    signal(SIGINT,  sig_handler);
    signal(SIGTERM, sig_handler);

    while (g_web_running) {
        while (auto upd = queue.pop()) {
            if (upd->is_snapshot) book.clear();
            for (auto& lvl : upd->levels)
                book.apply(lvl.side, lvl.price, lvl.qty);
        }

        auto bids = book.top_bids(20);
        auto asks = book.top_asks(20);

        if (!bids.empty() || !asks.empty()) {
            double mid = (!bids.empty() && !asks.empty())
                ? (bids[0].real_price() + asks[0].real_price()) / 2.0
                : 0.0;

            printf("{\"bids\":[");
            for (size_t i = 0; i < bids.size(); i++) {
                if (i) putchar(',');
                printf("[%.2f,%.8f]", bids[i].real_price(), bids[i].qty);
            }
            printf("],\"asks\":[");
            for (size_t i = 0; i < asks.size(); i++) {
                if (i) putchar(',');
                printf("[%.2f,%.8f]", asks[i].real_price(), asks[i].qty);
            }
            printf("],\"spread\":%.2f,\"mid\":%.2f}\n", book.spread(), mid);
            fflush(stdout);
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(50));
    }
}

int main(int argc, char* argv[]) {
    std::string symbol = "BTC/USD";
    bool live = false;
    bool web  = false;

    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--live") == 0) {
            live = true;
            if (i + 1 < argc) symbol = argv[++i];
        } else if (strcmp(argv[i], "--web") == 0) {
            web = true;
            if (i + 1 < argc) symbol = argv[++i];
        }
    }

    if (!live && !web) { usage(); return 1; }

    OrderBook   book;
    UpdateQueue queue;
    WsClient    client(queue);

    std::thread feed_thread([&] { client.run(symbol); });

    if (web)
        run_web(book, queue);
    else
        run_tui(book, queue, symbol);

    client.stop();
    feed_thread.join();
    return 0;
}
