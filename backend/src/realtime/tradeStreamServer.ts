import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer, IncomingMessage } from "http";
import { verifyAccessToken } from "../auth/jwt";
import { TradeRecord } from "../ingestion/tradesProvider";

const WS_PATH = "/ws/trades";
// Custom application-level close code (4000-4999 range is reserved for
// private use per RFC 6455). A real WS close code + reason lets a browser
// client's `onclose` handler distinguish "rejected for auth" from a
// generic connection failure, unlike an HTTP-level rejection at the
// upgrade handshake, which browsers don't expose to application code.
const UNAUTHORIZED_CLOSE_CODE = 4001;

// No tiering: any authenticated user (any role) gets the same full,
// immediate stream. See docs/decisions.md.
const clients = new Set<WebSocket>();

export function createTradeStreamServer(httpServer: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: WS_PATH });

  wss.on("connection", (ws, req) => {
    const token = extractToken(req);

    if (!token) {
      ws.close(UNAUTHORIZED_CLOSE_CODE, "missing token");
      return;
    }

    try {
      verifyAccessToken(token);
    } catch {
      ws.close(UNAUTHORIZED_CLOSE_CODE, "invalid or expired token");
      return;
    }

    clients.add(ws);
    console.log(`[trade-stream] client connected (${clients.size} total)`);

    ws.on("close", () => {
      clients.delete(ws);
      console.log(`[trade-stream] client disconnected (${clients.size} total)`);
    });

    ws.on("error", (err) => {
      console.error(`[trade-stream] client socket error: ${err.message}`);
    });
  });

  return wss;
}

function extractToken(req: IncomingMessage): string | null {
  if (!req.url) {
    return null;
  }
  const url = new URL(req.url, "http://localhost");
  return url.searchParams.get("token");
}

// Broadcasts to every currently-connected client. A dead/slow client
// (closed but not yet pruned, or a synchronous send failure) can't block
// or crash delivery to the others - each send is independently guarded.
export function broadcastTrades(trades: TradeRecord[]): void {
  if (trades.length === 0 || clients.size === 0) {
    return;
  }

  const message = JSON.stringify({ type: "trades", trades });

  for (const client of clients) {
    if (client.readyState !== WebSocket.OPEN) {
      continue;
    }
    try {
      client.send(message);
    } catch (err) {
      console.error(`[trade-stream] failed to send to a client: ${err instanceof Error ? err.message : err}`);
    }
  }
}

export function closeTradeStreamServer(wss: WebSocketServer): Promise<void> {
  return new Promise((resolve) => {
    for (const client of clients) {
      client.close(1001, "server shutting down");
    }
    wss.close(() => resolve());
  });
}
