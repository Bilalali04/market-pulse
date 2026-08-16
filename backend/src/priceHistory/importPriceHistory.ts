// One-off historical/batch backfill from a Kaggle CSV. Deliberately
// separate from the live Finnhub ingestion path (backend/src/ingestion) -
// this is a static, point-in-time import, not part of the streaming
// pipeline.
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { pool } from "../db/pool";

const CSV_PATH = path.resolve(__dirname, "../../data/stocks.csv");
const SOURCE = "kaggle-backfill";

interface ParsedCsv {
  tickers: string[];
  rows: { date: string; prices: Record<string, number> }[];
}

function parseCsv(raw: string): ParsedCsv {
  const lines = raw.trim().split("\n");
  const header = lines[0].split(",");
  // header[0] is an unnamed row-index column, header[1] is "Date", the
  // rest are one column per ticker (wide format).
  const tickers = header.slice(2).map((t) => t.trim());

  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",");
    const date = cells[1];
    const prices: Record<string, number> = {};

    tickers.forEach((ticker, i) => {
      const cell = cells[i + 2];
      const value = Number(cell);
      if (cell !== undefined && cell !== "" && !Number.isNaN(value)) {
        prices[ticker] = value;
      }
    });

    return { date, prices };
  });

  return { tickers, rows };
}

async function main() {
  const csvRaw = fs.readFileSync(CSV_PATH, "utf8");
  const { tickers, rows } = parseCsv(csvRaw);

  // Cross-reference against the fundamentals table (the single source of
  // truth for our watchlist) rather than a separate hardcoded symbol list,
  // so the two can't drift apart.
  const watchlistResult = await pool.query<{ symbol: string }>(`SELECT DISTINCT symbol FROM fundamentals`);
  const watchlist = watchlistResult.rows.map((r) => r.symbol);

  const matchedSymbols = tickers.filter((t) => watchlist.includes(t));
  const unmatchedWatchlistSymbols = watchlist.filter((s) => !tickers.includes(s));

  console.log(`CSV covers ${tickers.length} tickers, watchlist has ${watchlist.length} symbols`);
  console.log(`Importing ${matchedSymbols.length} matched symbols: ${matchedSymbols.join(", ")}`);
  if (unmatchedWatchlistSymbols.length > 0) {
    console.log(`Watchlist symbols with no CSV data (skipped): ${unmatchedWatchlistSymbols.join(", ")}`);
  }

  for (const symbol of matchedSymbols) {
    const values: unknown[] = [];
    const placeholders: string[] = [];
    let candidateCount = 0;

    for (const row of rows) {
      const price = row.prices[symbol];
      if (price === undefined) {
        continue;
      }
      const base = candidateCount * 4;
      placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
      values.push(symbol, row.date, price, SOURCE);
      candidateCount++;
    }

    if (candidateCount === 0) {
      console.log(`[${symbol}] no price rows found in CSV`);
      continue;
    }

    // ON CONFLICT DO NOTHING: this is a static backfill from a fixed file,
    // re-running it should be a pure no-op for rows already imported, not
    // an overwrite of existing data with identical values.
    const result = await pool.query(
      `INSERT INTO price_history (symbol, date, close_price, source)
       VALUES ${placeholders.join(", ")}
       ON CONFLICT (symbol, date) DO NOTHING`,
      values
    );

    console.log(`[${symbol}] inserted ${result.rowCount} of ${candidateCount} rows`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
