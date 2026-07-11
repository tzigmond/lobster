import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

_clients: set[WebSocket] = set()
_latest: str = ""

async def _broadcast(msg: str) -> None:
    global _latest
    _latest = msg
    dead: set[WebSocket] = set()
    for ws in list(_clients):
        try:
            await ws.send_text(msg)
        except Exception:
            dead.add(ws)
    _clients.difference_update(dead)

async def _engine_loop(symbol: str) -> None:
    exe = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "build", "lobster"))
    while True:
        try:
            proc = await asyncio.create_subprocess_exec(
                exe, "--web", symbol,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL,
            )
            async for raw in proc.stdout:  # type: ignore[union-attr]
                line = raw.decode().strip()
                if line:
                    await _broadcast(line)
        except Exception as exc:
            print(f"[engine] {exc}")
        await asyncio.sleep(2)

@asynccontextmanager
async def lifespan(_: FastAPI):
    asyncio.create_task(_engine_loop("BTC/USD"))
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket) -> None:
    await ws.accept()
    _clients.add(ws)
    if _latest:
        await ws.send_text(_latest)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        _clients.discard(ws)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
