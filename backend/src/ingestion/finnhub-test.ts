import path from "path";
import dotenv from "dotenv";
import WebSocket from "ws";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const SYMBOL = "AAPL";
const RUN_DURATION_MS = 30_000;

const apiKey = process.env.FINNHUB_API_KEY;
if (!apiKey) {
  throw new Error("FINNHUB_API_KEY is not set");
}

const socket = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);

socket.on("open", () => {
  console.log(`[open] connected to Finnhub, subscribing to ${SYMBOL}`);
  socket.send(JSON.stringify({ type: "subscribe", symbol: SYMBOL }));

  setTimeout(() => {
    console.log(`[shutdown] ${RUN_DURATION_MS / 1000}s window elapsed, unsubscribing from ${SYMBOL}`);
    socket.send(JSON.stringify({ type: "unsubscribe", symbol: SYMBOL }));
    socket.close();
  }, RUN_DURATION_MS);
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
});
