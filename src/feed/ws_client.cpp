#include "feed/ws_client.h"
#include <cstdio>

void WsClient::run(const std::string& symbol) {
    fprintf(stderr, "WARNING: WsClient not yet implemented\n");
    running_ = true;
    while (running_) {}
}

void WsClient::stop() {
    running_ = false;
}
