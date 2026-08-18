// Real observed shapes (captured from live Finnhub market data, Day 3):
//   {"type":"trade","data":[{"t":1787065188112,"p":310.49,"v":40,"c":["1","8"],"s":"AAPL"}]}
//   {"type":"ping"}

export interface FinnhubTrade {
  t: number;
  p: number;
  v: number;
  c: string[];
  s: string;
}

export type ParsedFinnhubMessage =
  | { kind: "trade"; trades: FinnhubTrade[] }
  | { kind: "ping" }
  | { kind: "unknown"; raw: string };

export function parseFinnhubMessage(raw: string): ParsedFinnhubMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: "unknown", raw };
  }

  if (!isRecord(parsed) || typeof parsed.type !== "string") {
    return { kind: "unknown", raw };
  }

  if (parsed.type === "ping") {
    return { kind: "ping" };
  }

  if (parsed.type === "trade") {
    if (!Array.isArray(parsed.data)) {
      return { kind: "unknown", raw };
    }
    // Malformed individual trade entries are dropped, not fatal: a single
    // bad entry in an otherwise-valid trade message shouldn't discard the
    // rest, and ingestion should never crash on unexpected input.
    return { kind: "trade", trades: parsed.data.filter(isValidTrade) };
  }

  return { kind: "unknown", raw };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidTrade(value: unknown): value is FinnhubTrade {
  return (
    isRecord(value) &&
    typeof value.t === "number" &&
    typeof value.p === "number" &&
    typeof value.v === "number" &&
    typeof value.s === "string" &&
    Array.isArray(value.c) &&
    value.c.every((code) => typeof code === "string")
  );
}
