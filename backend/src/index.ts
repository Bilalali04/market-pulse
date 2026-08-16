import express, { Request, Response } from "express";
import cors from "cors";
import { authRouter } from "./api/auth.routes";
import { debugRouter } from "./api/debug.routes";

const app = express();
const port = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/debug", debugRouter);

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
