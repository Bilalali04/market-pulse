// Replaces importPriceHistory.ts (deleted) and its Kaggle wide-format CSV
// (data/stocks.csv, deleted) - see docs/decisions.md for why: this
// dataset closes the AAPL/MO/WYNN gap, extends coverage to 10 years, and
// adds real volume, all of which the old dataset couldn't provide, so
// there was no reason to keep two competing backfill paths around.
//
// Source: data/sp500/{SYMBOL}.csv, one file per watchlist symbol,
// extracted from a Kaggle "SP500_Data_10Y" archive. Each file has a
// malformed 3-row multi-index header before the real data starts:
//   Row 1: Price,Close,High,Low,Open,Volume
//   Row 2: Ticker,<SYMBOL>,<SYMBOL>,<SYMBOL>,<SYMBOL>,<SYMBOL>
//   Row 3: Date,,,,,
// Row 3's first cell is the real name for column 0 (row 1's "Price" there
// is a leftover multi-index artifact, not a real column name). Column
// names are read from the header rows and looked up by name, not
// hardcoded by position, so this doesn't silently break if a file's
// column order ever differs from the norm.
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { pool } from "../db/pool";

const DATA_DIR = path.resolve(__dirname, "../../data/sp500");
const SOURCE = "kaggle-sp500-10y";

interface ParsedRow {
  date: string;
  close: number;
  volume: number;
}

function parseCsv(raw: string): ParsedRow[] {
  const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length < 4) {
    throw new Error(`expected at least 4 lines (3-row header + data), got ${lines.length}`);
  }

  const priceRow = lines[0].split(",");
  const dateRow = lines[2].split(",");

  // Column 0's real name comes from row 3 ("Date"), not row 1 ("Price" -
  // a multi-index leftover); every other column's name comes from row 1.
  const columnNames = priceRow.map((label, i) => (i === 0 ? dateRow[0] : label));

  function columnIndex(name: string): number {
    const index = columnNames.indexOf(name);
    if (index === -1) {
      throw new Error(`expected column "${name}" not found in header (got: ${columnNames.join(",")})`);
    }
    return index;
  }

  const dateIndex = columnIndex("Date");
  const closeIndex = columnIndex("Close");
  const volumeIndex = columnIndex("Volume");

  return lines.slice(3).map((line, i) => {
    const cells = line.split(",");
    const date = cells[dateIndex];
    const close = Number(cells[closeIndex]);
    const volume = Number(cells[volumeIndex]);

    if (!date || !Number.isFinite(close) || !Number.isFinite(volume)) {
      throw new Error(`malformed data row ${i + 4} (1-indexed, after the 3-row header): "${line}"`);
    }

    return { date, close, volume };
  });
}

async function main() {
  const watchlistResult = await pool.query<{ symbol: string }>(`SELECT DISTINCT symbol FROM fundamentals ORDER BY symbol`);
  const watchlist = watchlistResult.rows.map((r) => r.symbol);
  console.log(`watchlist (${watchlist.length}): ${watchlist.join(", ")}`);

  const client = await pool.connect();
  const insertedCounts: { symbol: string; rows: number }[] = [];

  try {
    await client.query("BEGIN");

    // Deliberately replacing, not merging - this dataset supersedes the
    // old Kaggle backfill entirely (see docs/decisions.md), so partial
    // overlap/dedup logic would just be complexity for a state that
    // shouldn't exist.
    await client.query("TRUNCATE TABLE price_history");

    for (const symbol of watchlist) {
      const filePath = path.join(DATA_DIR, `${symbol}.csv`);
      if (!fs.existsSync(filePath)) {
        throw new Error(`no CSV found for watchlist symbol ${symbol} at ${filePath}`);
      }

      const rows = parseCsv(fs.readFileSync(filePath, "utf8"));

      const values: unknown[] = [];
      const placeholders: string[] = [];
      rows.forEach((row, i) => {
        const base = i * 5;
        placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
        values.push(symbol, row.date, row.close, row.volume, SOURCE);
      });

      const result = await client.query(
        `INSERT INTO price_history (symbol, date, close_price, volume, source) VALUES ${placeholders.join(", ")}`,
        values
      );
      insertedCounts.push({ symbol, rows: result.rowCount ?? 0 });
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  // Only reported after a successful commit, so these numbers are
  // guaranteed to reflect what's actually in the database, not what a
  // since-rolled-back attempt would have inserted.
  console.log("\nper-symbol rows inserted:");
  for (const { symbol, rows } of insertedCounts) {
    console.log(`  ${symbol}: ${rows}`);
  }
  console.log(`\ntotal: ${insertedCounts.reduce((sum, r) => sum + r.rows, 0)} rows`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
