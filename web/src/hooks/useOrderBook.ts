import { useState, useEffect, useRef, useCallback } from 'react'
import type { BookSnapshot, ConnState } from '../types'

const WS_BASE      = 'ws://localhost:8000/ws'
const RECONNECT_MS = 3000
const HISTORY_MAX  = 600   // ~30 seconds at 50ms tick
const EMPTY: BookSnapshot = { bids: [], asks: [], spread: 0, mid: 0 }

type WireMessage = {
  bids: [number, number][]
  asks: [number, number][]
  spread: number
  mid:    number
}

export function useOrderBook(symbol: string) {
  const [book,         setBook]         = useState<BookSnapshot>(EMPTY)
  const [status,       setStatus]       = useState<ConnState>('connecting')
  const [priceHistory, setPriceHistory] = useState<number[]>([])

  const wsRef     = useRef<WebSocket | null>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Prevents stale timers from triggering reconnects after the hook unmounts
  // or when we deliberately replace a connection.
  const activeRef = useRef(true)

  const connect = useCallback(() => {
    if (!activeRef.current) return

    // Detach the onclose handler before closing so the close event doesn't
    // schedule a spurious reconnect. This was the root of the infinite loop:
    // connect() → close old WS → onclose fires → setTimeout(connect) → repeat.
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }

    setStatus('connecting')
    const url = `${WS_BASE}?symbol=${encodeURIComponent(symbol)}`
    const ws  = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (activeRef.current) setStatus('live')
    }

    ws.onmessage = (e: MessageEvent) => {
      try {
        const raw = JSON.parse(e.data as string) as WireMessage
        setBook({
          bids:   raw.bids.map(([price, qty]) => ({ price, qty })),
          asks:   raw.asks.map(([price, qty]) => ({ price, qty })),
          spread: raw.spread,
          mid:    raw.mid,
        })
        if (raw.mid > 0) {
          setPriceHistory(h => {
            const next = [...h, raw.mid]
            return next.length > HISTORY_MAX ? next.slice(-HISTORY_MAX) : next
          })
        }
      } catch {
        // ignore malformed frames
      }
    }

    ws.onclose = () => {
      if (!activeRef.current) return
      setStatus('disconnected')
      timerRef.current = setTimeout(connect, RECONNECT_MS)
    }

    ws.onerror = () => ws.close()
  }, [symbol])

  // Reset book and history when switching symbols
  useEffect(() => {
    setBook(EMPTY)
    setPriceHistory([])
  }, [symbol])

  useEffect(() => {
    activeRef.current = true
    connect()
    return () => {
      activeRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  return { book, status, priceHistory }
}
