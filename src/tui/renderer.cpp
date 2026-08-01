#include "tui/renderer.h"

#include <ftxui/component/component.hpp>
#include <ftxui/component/event.hpp>
#include <ftxui/component/screen_interactive.hpp>
#include <ftxui/dom/elements.hpp>
#include <ftxui/screen/color.hpp>

#include <atomic>
#include <chrono>
#include <iomanip>
#include <sstream>
#include <thread>

using namespace ftxui;

static std::string fmt_price(int64_t ticks) {
    std::ostringstream ss;
    ss << std::fixed << std::setprecision(2) << (ticks / 1e8);
    return ss.str();
}

static std::string fmt_qty(double qty) {
    std::ostringstream ss;
    ss << std::fixed << std::setprecision(4) << qty;
    return ss.str();
}

void run_tui(OrderBook& book, UpdateQueue& queue, const std::string& symbol) {
    auto screen = ScreenInteractive::Fullscreen();

    // Book snapshot - updated on the main thread via Custom event, read by renderer
    std::vector<PriceLevel> bids, asks;
    double spread_val = 0.0;
    bool   connected  = false;

    // Refresh thread: fires a Custom event every 50ms to drain queue and re-render
    std::atomic<bool> running{true};
    std::thread refresh([&] {
        while (running) {
            std::this_thread::sleep_for(std::chrono::milliseconds(50));
            screen.PostEvent(Event::Custom);
        }
    });

    auto renderer = Renderer([&] {
        // Header
        auto header = hbox({
            text(" LOBSTER ") | bold | color(Color::Cyan),
            text("│") | color(Color::GrayDark),
            text(" " + symbol + " ") | bold,
            text("│") | color(Color::GrayDark),
            text(connected ? " LIVE " : " CONNECTING...") |
                color(connected ? Color::Green : Color::Yellow),
        });

        // Column headers
        auto bid_header = hbox({
            text("   PRICE    ") | bold | color(Color::Green),
            text("     QTY") | bold | color(Color::GrayLight),
        });
        auto ask_header = hbox({
            text("   PRICE    ") | bold | color(Color::Red),
            text("     QTY") | bold | color(Color::GrayLight),
        });

        // Bid rows
        Elements bid_rows{bid_header};
        for (auto& lvl : bids) {
            bid_rows.push_back(hbox({
                text("  " + fmt_price(lvl.price) + "  ") | color(Color::Green),
                text(fmt_qty(lvl.qty)) | color(Color::GrayLight),
            }));
        }

        // Ask rows
        Elements ask_rows{ask_header};
        for (auto& lvl : asks) {
            ask_rows.push_back(hbox({
                text("  " + fmt_price(lvl.price) + "  ") | color(Color::Red),
                text(fmt_qty(lvl.qty)) | color(Color::GrayLight),
            }));
        }

        // Spread
        std::ostringstream ss;
        ss << std::fixed << std::setprecision(2) << spread_val;
        auto spread_line = hbox({
            text(" SPREAD: ") | color(Color::GrayDark),
            text("$" + ss.str()) | bold | color(Color::Yellow),
        });

        return vbox({
            header,
            separator(),
            hbox({
                vbox(bid_rows) | flex,
                separator(),
                vbox(ask_rows) | flex,
            }) | flex,
            separator(),
            spread_line,
            text(" press Q to quit") | color(Color::GrayDark),
        }) | border;
    });

    auto component = CatchEvent(renderer, [&](Event e) {
        if (e == Event::Custom) {
            // Drain the SPSC queue and apply updates to the book - all on main thread,
            // so no lock needed between queue drain and book read by renderer
            while (auto upd = queue.pop()) {
                connected = true;
                if (upd->is_snapshot) book.clear();
                for (auto& lvl : upd->levels)
                    book.apply(lvl.side, lvl.price, lvl.qty);
            }
            bids       = book.top_bids(10);
            asks       = book.top_asks(10);
            spread_val = book.spread();
            return true;
        }
        if (e == Event::Character('q') || e == Event::Character('Q')) {
            screen.ExitLoopClosure()();
            return true;
        }
        return false;
    });

    screen.Loop(component);

    running = false;
    refresh.join();
}
