import WebSocket from "ws";
import { pool } from "../db/pool";
import { parseFinnhubMessage, FinnhubTrade } from "./finnhubParser";
import { dedupeTrades, createDedupeWindowState, checkAndRecordTrade, DedupeWindowState } from "./tradeDedupe";
import { insertTrades, TradeRecord } from "./tradesProvider";

const FINNHUB_WS_URL = "wss://ws.finnhub.io";
const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
// Real captured cross-frame duplicates were only ~100ms-1s apart; 10s gives
// comfortable margin without holding unbounded state.
const DEDUPE_WINDOW_MS = 10_000;
const SUMMARY_INTERVAL_MS = 30_000;
// Bounded fallback in case the WebSocket's "close" event never fires
// during shutdown (e.g. the socket is already in a stuck state), so
// stop() can't hang indefinitely.
const CLOSE_TIMEOUT_MS = 3_000;

interface Stats {
  tradesReceived: number;
  duplicatesFiltered: number;
  rowsInserted: number;
  pingCount: number;
  unknownCount: number;
}

export class IngestionService {
  private readonly apiKey: string;
  private watchlist: string[] = [];
  private socket: WebSocket | undefined;
  private isShuttingDown = false;
  private backoffMs = INITIAL_BACKOFF_MS;
  private reconnectTimer: NodeJS.Timeout | undefined;
  private summaryTimer: NodeJS.Timeout | undefined;
  private dedupeState: DedupeWindowState = createDedupeWindowState();
  private pendingInserts: Set<Promise<void>> = new Set();
  private stats: Stats = {
    tradesReceived: 0,
    duplicatesFiltered: 0,
    rowsInserted: 0,
    pingCount: 0,
    unknownCount: 0,
  };

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async start(): Promise<void> {
    // Same watchlist source used elsewhere in the project (the
    // fundamentals table), not a separate hardcoded list.
    const watchlistResult = await pool.query<{ symbol: string }>(`SELECT DISTINCT symbol FROM fundamentals`);
    this.watchlist = watchlistResult.rows.map((row) => row.symbol);
    console.log(`[ingestion] watchlist (${this.watchlist.length}): ${this.watchlist.join(", ")}`);

    this.connect();
    this.summaryTimer = setInterval(() => this.logSummary(), SUMMARY_INTERVAL_MS);
  }

  // Async: waits for the socket to actually finish closing (so the
  // "connection closed" / "deliberate shutdown" log lines from the
  // "close" listener in connect() print before this resolves) and for any
  // in-flight insertTrades calls to finish, so a caller that does `await
  // service.stop(); await pool.end();` doesn't close the pool out from
  // under a pending write, and doesn't call process.exit() before this
  // service's own shutdown logging has printed.
  async stop(): Promise<void> {
    this.isShuttingDown = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.summaryTimer) {
      clearInterval(this.summaryTimer);
    }
    await this.closeSocketAndWait();
    await Promise.allSettled(this.pendingInserts);
    this.logSummary();
  }

  // Resolves once the WebSocket's own "close" event has fired (the
  // listener registered in connect() runs first and does the actual
  // logging, since it was registered earlier), or after CLOSE_TIMEOUT_MS
  // if "close" never fires for some reason.
  private closeSocketAndWait(): Promise<void> {
    const socket = this.socket;
    if (!socket || socket.readyState === WebSocket.CLOSED) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log("[ingestion] close event did not fire within timeout, continuing shutdown anyway");
        resolve();
      }, CLOSE_TIMEOUT_MS);

      socket.once("close", () => {
        clearTimeout(timeout);
        resolve();
      });

      socket.close();
    });
  }

  private connect(): void {
    console.log("[ingestion] connecting to Finnhub");
    this.socket = new WebSocket(`${FINNHUB_WS_URL}?token=${this.apiKey}`);

    this.socket.on("open", () => {
      console.log(`[ingestion] connected, subscribing to ${this.watchlist.length} symbols`);
      this.backoffMs = INITIAL_BACKOFF_MS;
      for (const symbol of this.watchlist) {
        this.socket?.send(JSON.stringify({ type: "subscribe", symbol }));
      }
    });

    this.socket.on("message", (data) => {
      this.handleMessage(data.toString());
    });

    this.socket.on("error", (err) => {
      console.error(`[ingestion] error: ${err.message}`);
    });

    this.socket.on("close", (code, reason) => {
      console.log(`[ingestion] connection closed, code=${code} reason=${reason.toString() || "(none)"}`);

      if (this.isShuttingDown) {
        console.log("[ingestion] deliberate shutdown, not reconnecting");
        return;
      }

      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    const delay = this.backoffMs;
    console.log(`[ingestion] unexpected disconnect, retrying in ${delay / 1000}s`);
    this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private handleMessage(raw: string): void {
    // isShuttingDown is set synchronously at the start of stop(), before
    // socket.close() is called, so any message that arrives during the
    // (non-instant) WS close handshake is seen and dropped here rather
    // than starting a new insert that stop()'s drain wouldn't know about.
    if (this.isShuttingDown) {
      return;
    }

    const parsed = parseFinnhubMessage(raw);

    // Ping/unknown frames are common (Finnhub sends pings on the same
    // socket) and expected - counted for the periodic summary, not logged
    // per-occurrence, that would be too noisy for a multi-symbol watchlist.
    if (parsed.kind === "ping") {
      this.stats.pingCount++;
      return;
    }

    if (parsed.kind === "unknown") {
      this.stats.unknownCount++;
      return;
    }

    this.stats.tradesReceived += parsed.trades.length;

    const withinMessageSurvivors = dedupeTrades(parsed.trades);
    const survivors: FinnhubTrade[] = [];

    for (const trade of withinMessageSurvivors) {
      const result = checkAndRecordTrade(this.dedupeState, trade, Date.now(), DEDUPE_WINDOW_MS);
      this.dedupeState = result.state;
      if (!result.isDuplicate) {
        survivors.push(trade);
      }
    }

    this.stats.duplicatesFiltered += parsed.trades.length - survivors.length;

    if (survivors.length === 0) {
      return;
    }

    const records: TradeRecord[] = survivors.map((trade) => ({
      symbol: trade.s,
      price: trade.p,
      volume: trade.v,
      conditionCodes: trade.c,
      tradedAt: new Date(trade.t),
    }));

    // Tracked (not awaited here) so stop() can drain in-flight inserts
    // before the caller closes the pool, without blocking this handler
    // from picking up the next incoming message.
    const insertPromise: Promise<void> = insertTrades(records)
      .then((inserted) => {
        this.stats.rowsInserted += inserted;
      })
      .catch((err) => {
        console.error(`[ingestion] failed to insert trades: ${err instanceof Error ? err.message : err}`);
      })
      .finally(() => {
        this.pendingInserts.delete(insertPromise);
      });

    this.pendingInserts.add(insertPromise);
  }

  private logSummary(): void {
    console.log(
      `[ingestion] summary: received=${this.stats.tradesReceived} duplicatesFiltered=${this.stats.duplicatesFiltered} inserted=${this.stats.rowsInserted} pings=${this.stats.pingCount} unknown=${this.stats.unknownCount}`
    );
  }
}
