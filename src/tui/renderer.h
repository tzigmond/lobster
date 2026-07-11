#pragma once
#include "book/order_book.h"
#include "feed/ws_client.h"  // for UpdateQueue

void run_tui(OrderBook& book, UpdateQueue& queue, const std::string& symbol);
