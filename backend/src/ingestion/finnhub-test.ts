import path from "path";
import dotenv from "dotenv";
import WebSocket from "ws";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const SYMBOL = "AAPL";
const RUN_DURATION_MS = 30_000;
// Test hook: forces an unexpected disconnect partway through the run so
// reconnect + resubscribe can be verified on demand, instead of waiting for
// a real network failure.
const FORCE_DISCONNECT_AT_MS = 10_000;

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

const apiKey = process.env.FINNHUB_API_KEY;
if (!apiKey) {
  throw new Error("FINNHUB_API_KEY is not set");
}

let socket: WebSocket | undefined;
let isShuttingDown = false;
let backoffMs = INITIAL_BACKOFF_MS;
let reconnectTimer: NodeJS.Timeout | undefined;

function connect(): void {
  console.log("[connect] opening connection to Finnhub");
  socket = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);

  socket.on("open", () => {
    console.log(`[open] connected, subscribing to ${SYMBOL}`);
    backoffMs = INITIAL_BACKOFF_MS;
    socket?.send(JSON.stringify({ type: "subscribe", symbol: SYMBOL }));
  });

  socket.on("message", (data) => {
    const message = JSON.parse(data.toString());
    if (message.type === "trade") {
      for (const trade of message.data ?? []) {
        console.log(
          `[trade] ${trade.s} price=${trade.p} volume=${trade.v} timestamp=${new Date(trade.t).toISOString()}`
        );
      }
    } else {
      console.log(`[message] ${JSON.stringify(message)}`);
    }
  });

  socket.on("error", (err) => {
    console.error(`[error] ${err.message}`);
  });

  socket.on("close", (code, reason) => {
    console.log(`[close] connection closed, code=${code} reason=${reason.toString() || "(none)"}`);

    if (isShuttingDown) {
      console.log("[shutdown] deliberate close, not reconnecting");
      return;
    }

    scheduleReconnect();
  });
}

function scheduleReconnect(): void {
  const delay = backoffMs;
  console.log(`[reconnect] unexpected disconnect, retrying in ${delay / 1000}s`);
  backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
  reconnectTimer = setTimeout(connect, delay);
}

connect();

setTimeout(() => {
  console.log("[test-hook] forcing an unexpected disconnect to verify reconnect logic");
  socket?.terminate();
}, FORCE_DISCONNECT_AT_MS);

setTimeout(() => {
  console.log(`[shutdown] ${RUN_DURATION_MS / 1000}s window elapsed, shutting down deliberately`);
  isShuttingDown = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "unsubscribe", symbol: SYMBOL }));
  }
  socket?.close();
}, RUN_DURATION_MS);
