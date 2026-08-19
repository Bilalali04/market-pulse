import { Router, Request, Response } from "express";
import { authenticate } from "../auth/authenticate";
import { getPriceHistory } from "../priceHistory/priceHistoryProvider";
import { calculateSMA, InvalidPeriodError } from "../analytics/movingAverages";
import { calculateRSI } from "../analytics/rsi";
import { calculateMACD, MacdResult } from "../analytics/macd";

export const indicatorsRouter = Router();

const SMA_PERIOD = 20;

// Each indicator has its own minimum-data requirement (SMA needs
// SMA_PERIOD closes, RSI/MACD need their own default periods' worth), and
// symbols with thin history (see docs/decisions.md on the Kaggle backfill
// gaps) can easily fall short. Catching InvalidPeriodError here and
// returning an all-null series - rather than letting it 500 the request -
// keeps this endpoint's contract the same shape regardless of how much
// history a symbol has; the frontend already has to handle sparse/null
// data since price history itself can be short.
function safeSMA(closes: number[]): (number | null)[] {
  try {
    return calculateSMA(closes, SMA_PERIOD);
  } catch (err) {
    if (err instanceof InvalidPeriodError) {
      return new Array(closes.length).fill(null);
    }
    throw err;
  }
}

function safeRSI(closes: number[]): (number | null)[] {
  try {
    return calculateRSI(closes);
  } catch (err) {
    if (err instanceof InvalidPeriodError) {
      return new Array(closes.length).fill(null);
    }
    throw err;
  }
}

function safeMACD(closes: number[]): MacdResult {
  try {
    return calculateMACD(closes);
  } catch (err) {
    if (err instanceof InvalidPeriodError) {
      const nulls = new Array(closes.length).fill(null);
      return { macdLine: nulls, signalLine: nulls, histogram: nulls };
    }
    throw err;
  }
}

indicatorsRouter.get("/:symbol", authenticate, async (req: Request, res: Response) => {
  const symbol = req.params.symbol.toUpperCase();

  const prices = await getPriceHistory(symbol);
  if (prices.length === 0) {
    res.status(404).json({ error: `no price history for symbol ${symbol}` });
    return;
  }

  const dates = prices.map((p) => p.date);
  const closes = prices.map((p) => p.closePrice);

  res.status(200).json({
    symbol,
    dates,
    sma: safeSMA(closes),
    rsi: safeRSI(closes),
    macd: safeMACD(closes),
  });
});
