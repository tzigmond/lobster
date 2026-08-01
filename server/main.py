import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

EXE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "build", "lobster"))

# Per-symbol state - engines start lazily on first subscriber
_clients: dict[str, set[WebSocket]] = {}
_latest:  dict[str, str]            = {}
_engines: dict[str, asyncio.Task]   = {}


async def _broadcast(symbol: str, msg: str) -> None:
    _latest[symbol] = msg
    dead: set[WebSocket] = set()
    for ws in list(_clients.get(symbol, set())):
        try:
            await ws.send_text(msg)
        except Exception:
            dead.add(ws)
    if dead:
        _clients.setdefault(symbol, set()).difference_update(dead)


async def _engine_loop(symbol: str) -> None:
    while True:
        try:
            proc = await asyncio.create_subprocess_exec(
                EXE, "--web", symbol,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL,
            )
            async for raw in proc.stdout:  # type: ignore[union-attr]
                line = raw.decode().strip()
                if line:
                    await _broadcast(symbol, line)
        except Exception as exc:
            print(f"[engine:{symbol}] {exc}")
        await asyncio.sleep(2)


def _ensure_engine(symbol: str) -> None:
    if symbol not in _engines:
        _engines[symbol] = asyncio.create_task(_engine_loop(symbol))


@asynccontextmanager
async def lifespan(_: FastAPI):
    _ensure_engine("BTC/USD")
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket, symbol: str = "BTC/USD") -> None:
    await ws.accept()
    _ensure_engine(symbol)
    _clients.setdefault(symbol, set()).add(ws)

    # Send cached snapshot immediately so the client doesn't stare at a blank screen
    if symbol in _latest:
        await ws.send_text(_latest[symbol])

    try:
        # receive() handles text, binary, ping/pong, and close frames correctly.
        # receive_text() raises on any non-text frame including browser pings.
        while True:
            msg = await ws.receive()
            if msg.get("type") == "websocket.disconnect":
                break
    except Exception:
        pass
    finally:
        _clients.setdefault(symbol, set()).discard(ws)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
