import { pool } from "../db/pool";
import { Fundamentals, FundamentalsProvider } from "./fundamentalsProvider";

interface FundamentalsRow {
  sector: string;
  debt_to_market_cap: string | null;
}

export interface FundamentalsUpsert {
  symbol: string;
  sector: string;
  debtToMarketCap: number | null;
  source: string;
}

export class PostgresFundamentalsProvider implements FundamentalsProvider {
  async getFundamentals(symbol: string): Promise<Fundamentals | null> {
    const result = await pool.query<FundamentalsRow>(
      `SELECT sector, debt_to_market_cap FROM fundamentals WHERE symbol = $1`,
      [symbol]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      sector: row.sector,
      debtToMarketCap: row.debt_to_market_cap === null ? null : Number(row.debt_to_market_cap),
    };
  }

  async upsert(entry: FundamentalsUpsert): Promise<void> {
    await pool.query(
      `INSERT INTO fundamentals (symbol, sector, debt_to_market_cap, source, last_updated)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (symbol) DO UPDATE SET
         sector = EXCLUDED.sector,
         debt_to_market_cap = EXCLUDED.debt_to_market_cap,
         source = EXCLUDED.source,
         last_updated = now()`,
      [entry.symbol, entry.sector, entry.debtToMarketCap, entry.source]
    );
  }
}
