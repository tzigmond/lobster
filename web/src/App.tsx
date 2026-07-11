import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Live } from './pages/Live'
import { Architecture } from './pages/Architecture'
import { Performance } from './pages/Performance'
import { useOrderBook } from './hooks/useOrderBook'

export function App() {
  const [symbol, setSymbol] = useState('BTC/USD')
  const { book, status, priceHistory } = useOrderBook(symbol)

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-[#080b14]">
        <Navbar status={status} symbol={symbol} onSymbol={setSymbol} />
        <Routes>
          <Route
            path="/"
            element={<Live book={book} status={status} symbol={symbol} priceHistory={priceHistory} />}
          />
          <Route path="/architecture" element={<Architecture />} />
          <Route path="/performance"  element={<Performance />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
