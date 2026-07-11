import { useState, useEffect, useRef, useCallback } from 'react'
import type { BookSnapshot, ConnState } from '../types'

const WS_URL         = 'ws://localhost:8000/ws'
const RECONNECT_MS   = 2500
const EMPTY: BookSnapshot = { bids: [], asks: [], spread: 0, mid: 0 }

type WireMessage = {
  bids: [number, number][]
  asks: [number, number][]
  spread: number
  mid: number
}

export function useOrderBook() {
  const [book,   setBook]   = useState<BookSnapshot>(EMPTY)
  const [status, setStatus] = useState<ConnState>('connecting')
  const wsRef    = useRef<WebSocket | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current) wsRef.current.close()
    setStatus('connecting')
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => setStatus('live')

    ws.onmessage = (e: MessageEvent) => {
      try {
        const raw = JSON.parse(e.data as string) as WireMessage
        setBook({
          bids:   raw.bids.map(([price, qty]) => ({ price, qty })),
          asks:   raw.asks.map(([price, qty]) => ({ price, qty })),
          spread: raw.spread,
          mid:    raw.mid,
        })
      } catch {
        // ignore malformed frames
      }
    }

    ws.onclose = () => {
      setStatus('disconnected')
      timerRef.current = setTimeout(connect, RECONNECT_MS)
    }

    ws.onerror = () => ws.close()
  }, [])

  useEffect(() => {
    connect()
    return () => {
      timerRef.current && clearTimeout(timerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { book, status }
}
