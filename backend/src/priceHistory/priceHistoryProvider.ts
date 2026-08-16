import { pool } from "../db/pool";

export interface PricePoint {
  date: string;
  closePrice: number;
}

interface PriceHistoryRow {
  // pg's default type parser returns SQL `date` columns as JS Date
  // objects, not strings.
  date: Date;
  close_price: string;
}

export async function getPriceHistory(symbol: string): Promise<PricePoint[]> {
  const result = await pool.query<PriceHistoryRow>(
    `SELECT date, close_price FROM price_history WHERE symbol = $1 ORDER BY date ASC`,
    [symbol]
  );

  return result.rows.map((row) => ({
    date: row.date.toISOString().slice(0, 10),
    closePrice: Number(row.close_price),
  }));
}
