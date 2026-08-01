#pragma once
#include <atomic>
#include <array>
#include <cstddef>
#include <optional>

// Lock-free single-producer single-consumer queue over a power-of-2 ring buffer.
// Used on the feed->book boundary: the network thread pushes BookUpdates, the
// main thread pops them. Key design decisions:
//   - head_ and tail_ each on their own 64-byte cache line (alignas(64))
//     to prevent false sharing between producer and consumer threads
//   - acquire/release memory ordering on load/store - no seq_cst overhead
//   - capacity must be a power of 2 so index wraparound is a bitmask (& mask_)
//     instead of a modulo (which compiles to a division)
//
// Why no mutex: a mutex on this boundary would serialize the two threads
// and add 50-200 ns per message crossing. The atomic ring buffer passes
// updates with a single store (producer) and single load (consumer).
//
// Ref: Preshing - "Writing a Generalized Concurrent Queue" (2014)
// Ref: CppCon 2017 - Fedor Pikus, "C++ atomics, from basic to advanced"

template<typename T, size_t Capacity>
class SPSCQueue {
    static_assert((Capacity & (Capacity - 1)) == 0, "Capacity must be power of 2");

    alignas(64) std::atomic<size_t> head_{0};
    alignas(64) std::atomic<size_t> tail_{0};
    std::array<T, Capacity> buf_;
    static constexpr size_t mask_ = Capacity - 1;

public:
    bool push(const T& val) {
        size_t h = head_.load(std::memory_order_relaxed);
        size_t next = (h + 1) & mask_;
        if (next == tail_.load(std::memory_order_acquire)) return false;  // full
        buf_[h] = val;
        head_.store(next, std::memory_order_release);
        return true;
    }

    std::optional<T> pop() {
        size_t t = tail_.load(std::memory_order_relaxed);
        if (t == head_.load(std::memory_order_acquire)) return std::nullopt;  // empty
        T val = buf_[t];
        tail_.store((t + 1) & mask_, std::memory_order_release);
        return val;
    }
};
