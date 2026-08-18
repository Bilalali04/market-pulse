import { FinnhubTrade } from "./finnhubParser";

// A trade is identified by symbol + timestamp + price + volume. Condition
// codes (c) are metadata about the same trade, not part of its identity -
// two entries differing only in `c` are still the same trade.
function tradeKey(trade: FinnhubTrade): string {
  return `${trade.s}:${trade.t}:${trade.p}:${trade.v}`;
}

// Pure: dedupes within a single provided array (e.g. one message's `data`),
// keeping the first occurrence of each (t, p, v, s) combination.
export function dedupeTrades(trades: FinnhubTrade[]): FinnhubTrade[] {
  const seen = new Set<string>();
  const result: FinnhubTrade[] = [];

  for (const trade of trades) {
    const key = tradeKey(trade);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(trade);
    }
  }

  return result;
}

// Cross-message dedup, catching duplicates that arrive in separate WS
// frames (observed directly in real capture: identical trade data
// delivered as two distinct messages). State is threaded explicitly
// in/out rather than mutated internally, and `now` is passed in rather
// than read from the system clock, so this stays a pure function callers
// can unit test without real timers. The stateful wrapper that holds this
// across real WebSocket messages with a live clock is a live-ingestion
// wiring concern, not part of this pure module.
export interface DedupeWindowState {
  seenAt: Map<string, number>;
}

export function createDedupeWindowState(): DedupeWindowState {
  return { seenAt: new Map() };
}

export interface DedupeCheckResult {
  isDuplicate: boolean;
  state: DedupeWindowState;
}

export function checkAndRecordTrade(
  state: DedupeWindowState,
  trade: FinnhubTrade,
  now: number,
  windowMs: number
): DedupeCheckResult {
  const key = tradeKey(trade);

  const prunedEntries = [...state.seenAt].filter(([, seenAt]) => now - seenAt <= windowMs);
  const isDuplicate = prunedEntries.some(([entryKey]) => entryKey === key);

  if (!isDuplicate) {
    prunedEntries.push([key, now]);
  }

  return { isDuplicate, state: { seenAt: new Map(prunedEntries) } };
}
