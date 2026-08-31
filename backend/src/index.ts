import http from "http";
import express, { Request, Response } from "express";
import cors from "cors";
import { authRouter } from "./api/auth.routes";
import { googleAuthRouter } from "./api/googleAuth.routes";
import { debugRouter } from "./api/debug.routes";
import { screenerRouter } from "./api/screener.routes";
import { pricesRouter } from "./api/prices.routes";
import { indicatorsRouter } from "./api/indicators.routes";
import { createTradeStreamServer, closeTradeStreamServer } from "./realtime/tradeStreamServer";
import { IngestionService } from "./ingestion/ingestionService";
import { pool } from "./db/pool";

const app = express();
const port = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/auth", googleAuthRouter);
app.use("/debug", debugRouter);
app.use("/screener", screenerRouter);
app.use("/prices", pricesRouter);
app.use("/indicators", indicatorsRouter);

// WebSocket server attached to the same HTTP server, not a separate port.
const server = http.createServer(app);
const wss = createTradeStreamServer(server);

// Ingestion needs to run in the same process as the WS server so
// broadcastTrades can reach the in-memory client set directly (no Redis
// pub/sub yet). backend/src/ingestion/run.ts remains available as a
// standalone alternative when you just want ingestion without the API/WS
// server. Guarded on FINNHUB_API_KEY so the API can still start without it
// for auth/screener/prices-only work.
let ingestionService: IngestionService | undefined;
if (process.env.FINNHUB_API_KEY) {
  ingestionService = new IngestionService(process.env.FINNHUB_API_KEY);
  ingestionService.start().catch((err) => {
    console.error("[index] failed to start ingestion service:", err);
  });
} else {
  console.warn("[index] FINNHUB_API_KEY not set, ingestion service disabled");
}

let isShuttingDown = false;

async function shutdown(reason: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  console.log(`[index] shutting down (${reason})`);
  if (ingestionService) {
    await ingestionService.stop();
  }
  await closeTradeStreamServer(wss);
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
  console.log("[index] shutdown complete");
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

server.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
