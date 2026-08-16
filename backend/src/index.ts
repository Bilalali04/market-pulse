import express, { Request, Response } from "express";
import cors from "cors";
import { authRouter } from "./api/auth.routes";
import { debugRouter } from "./api/debug.routes";
import { screenerRouter } from "./api/screener.routes";
import { pricesRouter } from "./api/prices.routes";

const app = express();
const port = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/debug", debugRouter);
app.use("/screener", screenerRouter);
app.use("/prices", pricesRouter);

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
