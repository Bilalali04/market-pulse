import express, { Request, Response } from "express";
import { authRouter } from "./api/auth.routes";

const app = express();
const port = process.env.PORT ?? 3001;

app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
