import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { pool } from "../db/pool";
import { FinnhubFundamentalsFetcher } from "./finnhubFundamentalsFetcher";
import { PostgresFundamentalsProvider } from "./postgresFundamentalsProvider";

const SOURCE = "finnhub-seed";

// Real, well-known US-listed symbols. Includes JPM, BAC (conventional
// interest-based banking), MO (tobacco), and WYNN (gambling/casino) so the
// halal sector screen has known-fail cases to prove rejection against, not
// just approval.
const WATCHLIST = [
  "AAPL",
  "MSFT",
  "GOOGL",
  "NVDA",
  "ADBE",
  "JNJ",
  "PG",
  "KO",
  "MCD",
  "HD",
  "PFE",
  "UNH",
  "XOM",
  "CVX",
  "JPM",
  "BAC",
  "MO",
  "WYNN",
];

async function main() {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    throw new Error("FINNHUB_API_KEY is not set");
  }

  const fetcher = new FinnhubFundamentalsFetcher(apiKey);
  const provider = new PostgresFundamentalsProvider();

  for (const symbol of WATCHLIST) {
    const startedAt = Date.now();
    try {
      console.log(`[fetch] ${symbol}`);
      const fundamentals = await fetcher.fetch(symbol);
      const elapsedMs = Date.now() - startedAt;
      console.log(
        `[fetched] ${symbol} sector=${fundamentals.sector} debtToMarketCap=${fundamentals.debtToMarketCap} (${elapsedMs}ms)`
      );

      await provider.upsert({
        symbol,
        sector: fundamentals.sector,
        debtToMarketCap: fundamentals.debtToMarketCap,
        source: SOURCE,
      });
      console.log(`[upserted] ${symbol}`);
    } catch (err) {
      console.error(`[error] ${symbol}: ${err instanceof Error ? err.message : err}`);
    }
  }

  await pool.end();
}

main();
