import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Live } from './pages/Live'
import { Architecture } from './pages/Architecture'
import { Performance } from './pages/Performance'
import { useOrderBook } from './hooks/useOrderBook'

export function App() {
  const { book, status } = useOrderBook()

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-[#080b14]">
        <Navbar status={status} />
        <Routes>
          <Route path="/"             element={<Live book={book} status={status} />} />
          <Route path="/architecture" element={<Architecture />} />
          <Route path="/performance"  element={<Performance />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
