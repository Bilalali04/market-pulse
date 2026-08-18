import { pool } from "../db/pool";

export interface TradeRecord {
  symbol: string;
  price: number;
  volume: number;
  conditionCodes: string[] | null;
  tradedAt: Date;
}

const COLUMNS_PER_ROW = 5;

export async function insertTrades(trades: TradeRecord[]): Promise<number> {
  if (trades.length === 0) {
    return 0;
  }

  const values: unknown[] = [];
  const placeholders: string[] = [];

  trades.forEach((trade, i) => {
    const base = i * COLUMNS_PER_ROW;
    placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
    values.push(trade.symbol, trade.price, trade.volume, trade.conditionCodes, trade.tradedAt);
  });

  const result = await pool.query(
    `INSERT INTO trades (symbol, price, volume, condition_codes, traded_at)
     VALUES ${placeholders.join(", ")}`,
    values
  );

  return result.rowCount ?? 0;
}
