import { Router, Request, Response } from "express";
import { authenticate } from "../auth/authenticate";
import { PostgresFundamentalsProvider } from "../screener/postgresFundamentalsProvider";
import { screenFundamentals } from "../screener/screening";

export const screenerRouter = Router();

const fundamentalsProvider = new PostgresFundamentalsProvider();

screenerRouter.get("/:symbol", authenticate, async (req: Request, res: Response) => {
  const symbol = req.params.symbol.toUpperCase();

  const fundamentals = await fundamentalsProvider.getFundamentals(symbol);
  if (!fundamentals) {
    res.status(404).json({ error: `no fundamentals data for symbol ${symbol}` });
    return;
  }

  const result = screenFundamentals(symbol, fundamentals);
  res.status(200).json({ symbol, ...result });
});
