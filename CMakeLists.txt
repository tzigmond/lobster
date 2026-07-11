cmake_minimum_required(VERSION 3.20)
project(lob_live CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------
include(FetchContent)

# simdjson — SIMD-accelerated JSON parser
FetchContent_Declare(
    simdjson
    GIT_REPOSITORY https://github.com/simdjson/simdjson.git
    GIT_TAG        v3.10.1
)
FetchContent_MakeAvailable(simdjson)

# ftxui — terminal UI framework
FetchContent_Declare(
    ftxui
    GIT_REPOSITORY https://github.com/ArthurSonzogni/FTXUI.git
    GIT_TAG        v5.0.0
)
set(FTXUI_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(FTXUI_BUILD_DOCS     OFF CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(ftxui)

# Boost.Beast (WebSocket) + OpenSSL (wss://)
find_package(Boost 1.74 REQUIRED COMPONENTS system)
find_package(OpenSSL REQUIRED)
find_package(Threads REQUIRED)

# ---------------------------------------------------------------------------
# Common include path
# ---------------------------------------------------------------------------
set(COMMON_INCLUDES ${CMAKE_CURRENT_SOURCE_DIR}/src)

# ---------------------------------------------------------------------------
# lob_live — full app: WebSocket feed + order book + TUI
# ---------------------------------------------------------------------------
add_executable(lob_live
    src/main.cpp
    src/book/order_book.cpp
    src/feed/ws_client.cpp
    src/feed/parser.cpp
    src/tui/renderer.cpp
)

target_include_directories(lob_live PRIVATE
    ${COMMON_INCLUDES}
    ${Boost_INCLUDE_DIRS}
)

target_link_libraries(lob_live PRIVATE
    simdjson
    ftxui::screen
    ftxui::dom
    ftxui::component
    OpenSSL::SSL
    OpenSSL::Crypto
    Boost::system
    Threads::Threads
)

target_compile_options(lob_live PRIVATE -O3 -march=native)

# ---------------------------------------------------------------------------
# lob_bench — benchmark only: no WebSocket, no TUI
# ---------------------------------------------------------------------------
add_executable(lob_bench
    src/bench/bench_book.cpp
    src/book/order_book.cpp
)

target_include_directories(lob_bench PRIVATE ${COMMON_INCLUDES})
target_link_libraries(lob_bench PRIVATE Threads::Threads)
target_compile_options(lob_bench PRIVATE -O3 -march=native)
