"use client";

import { useEffect, useState } from "react";
import { getToken } from "./token";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 10_000;
// Matches the backend's tradeStreamServer close code for missing/invalid
// tokens - retrying with the same bad token won't help, so this is
// treated as a terminal auth failure, not a transient disconnect.
const AUTH_FAILURE_CLOSE_CODE = 4001;

export interface LiveTrade {
  price: number;
  tradedAt: string;
}

export type TradeStreamStatus = "connecting" | "open" | "reconnecting" | "auth-error";

interface IncomingTrade {
  symbol: string;
  price: number;
  tradedAt: string;
}

interface TradesMessage {
  type: "trades";
  trades: IncomingTrade[];
}

export function useTradeStream() {
  const [latestTrades, setLatestTrades] = useState<Record<string, LiveTrade>>({});
  const [status, setStatus] = useState<TradeStreamStatus>("connecting");

  useEffect(() => {
    let socket: WebSocket | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let backoffMs = INITIAL_BACKOFF_MS;
    let cancelled = false;

    function scheduleReconnect() {
      const delay = backoffMs;
      backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
      reconnectTimer = setTimeout(connect, delay);
    }

    function connect() {
      const token = getToken();
      if (!token) {
        setStatus("auth-error");
        return;
      }

      setStatus((prev) => (prev === "open" ? prev : "connecting"));
      socket = new WebSocket(`${WS_BASE_URL}/ws/trades?token=${token}`);

      socket.onopen = () => {
        if (cancelled) return;
        backoffMs = INITIAL_BACKOFF_MS;
        setStatus("open");
      };

      socket.onmessage = (event) => {
        if (cancelled) return;
        let message: TradesMessage;
        try {
          message = JSON.parse(event.data);
        } catch {
          return; // malformed frame, don't crash the UI over it
        }
        if (message?.type !== "trades" || !Array.isArray(message.trades)) return;

        setLatestTrades((prev) => {
          const next = { ...prev };
          for (const trade of message.trades) {
            next[trade.symbol] = { price: trade.price, tradedAt: trade.tradedAt };
          }
          return next;
        });
      };

      socket.onclose = (event) => {
        if (cancelled) return;

        if (event.code === AUTH_FAILURE_CLOSE_CODE) {
          setStatus("auth-error");
          return;
        }

        setStatus("reconnecting");
        scheduleReconnect();
      };

      // onclose fires immediately after onerror for a socket error, and
      // handles reconnect/auth-error there - no separate handling needed.
      socket.onerror = () => {};
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, []);

  return { latestTrades, status };
}
