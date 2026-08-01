#include "feed/ws_client.h"

#include <boost/beast/core.hpp>
#include <boost/beast/ssl.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/beast/websocket/ssl.hpp>
#include <boost/asio/connect.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/asio/ssl/context.hpp>
#include <boost/asio/io_context.hpp>

#include <cstdio>
#include <string>

namespace beast = boost::beast;
namespace ws    = beast::websocket;
namespace net   = boost::asio;
namespace ssl   = net::ssl;
using tcp       = net::ip::tcp;
using WssStream = ws::stream<ssl::stream<beast::tcp_stream>>;

static constexpr const char* HOST = "ws.kraken.com";
static constexpr const char* PORT = "443";
static constexpr const char* PATH = "/v2";

void WsClient::run(const std::string& symbol) {
    running_ = true;

    try {
        net::io_context ioc;
        ssl::context    ssl_ctx{ssl::context::tlsv12_client};
        ssl_ctx.set_default_verify_paths();
        ssl_ctx.set_verify_mode(ssl::verify_peer);

        // Resolve
        tcp::resolver resolver{ioc};
        auto const endpoints = resolver.resolve(HOST, PORT);

        // Connect
        WssStream stream{ioc, ssl_ctx};
        beast::get_lowest_layer(stream).connect(endpoints);

        // SNI - required by Kraken, otherwise TLS handshake fails
        if (!SSL_set_tlsext_host_name(stream.next_layer().native_handle(), HOST))
            throw beast::system_error{beast::error_code(
                static_cast<int>(::ERR_get_error()), net::error::get_ssl_category())};

        // TLS handshake
        stream.next_layer().handshake(ssl::stream_base::client);

        // WebSocket handshake
        stream.set_option(ws::stream_base::decorator([](ws::request_type& req) {
            req.set(boost::beast::http::field::user_agent, "lobster/1.0");
        }));
        stream.handshake(HOST, PATH);

        printf("[feed] connected to Kraken\n");

        // Subscribe to L2 book
        std::string sub =
            R"({"method":"subscribe","params":{"channel":"book","symbol":[")"
            + symbol +
            R"("],"depth":10}})";
        stream.write(net::buffer(sub));

        // Read loop - exits when running_ is set false by stop()
        // Kraken sends heartbeats ~every 1s so stop() resolves within ~1s
        beast::flat_buffer buf;
        while (running_) {
            buf.clear();
            beast::error_code ec;
            stream.read(buf, ec);

            if (ec == ws::error::closed) break;
            if (ec) {
                if (running_)
                    fprintf(stderr, "[feed] read error: %s\n", ec.message().c_str());
                break;
            }

            std::string raw{static_cast<const char*>(buf.data().data()), buf.size()};
            auto update = parse_message(raw);
            // Always push snapshots (even with empty levels) so the book.clear()
            // in the consumer fires correctly. Drop only non-snapshot empty updates.
            if (!update.levels.empty() || update.is_snapshot) {
                if (!queue_.push(update))
                    fprintf(stderr, "[feed] queue full - update dropped\n");
            }
        }

        beast::error_code ec;
        stream.close(ws::close_code::normal, ec);
        printf("[feed] disconnected\n");

    } catch (const std::exception& e) {
        fprintf(stderr, "[feed] error: %s\n", e.what());
    }

    running_ = false;
}

void WsClient::stop() {
    running_ = false;
}
