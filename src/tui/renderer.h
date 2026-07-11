#pragma once
#include "book/order_book.h"

// TODO (stage 7): implement ftxui TUI renderer
//
// Renders a snapshot of the order book at ~20 fps (50ms tick).
// Layout:
//
//   ┌───────────────────────────────────────────┐
//   │       BTC/USD  │  Last: $67,842.10        │
//   ├────────────────┬──────────────────────────┤
//   │  BID     QTY   │  ASK     QTY             │
//   │  67,840  1.243 │  67,844  0.891           │
//   │  67,838  0.502 │  67,846  2.104           │
//   ├────────────────┴──────────────────────────┤
//   │  TRADES                                   │
//   │  67,842  0.112  BUY   12:04:33.441        │
//   └───────────────────────────────────────────┘
//
// The render thread takes a snapshot of the book under a brief lock,
// then renders the snapshot — decoupling render rate from update rate.
//
// Ref: ftxui component docs — https://github.com/ArthurSonzogni/FTXUI

void run_tui(OrderBook& book, const std::string& symbol);
