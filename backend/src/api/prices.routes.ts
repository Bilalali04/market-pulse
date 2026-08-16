import { Router, Request, Response } from "express";
import { authenticate } from "../auth/authenticate";
import { getPriceHistory } from "../priceHistory/priceHistoryProvider";

export const pricesRouter = Router();

pricesRouter.get("/:symbol", authenticate, async (req: Request, res: Response) => {
  const symbol = req.params.symbol.toUpperCase();

  const prices = await getPriceHistory(symbol);
  if (prices.length === 0) {
    res.status(404).json({ error: `no price history for symbol ${symbol}` });
    return;
  }

  res.status(200).json({ symbol, prices });
});
