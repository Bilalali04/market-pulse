// Standalone entry point for the ingestion service. Not wired into the
// Express app - running this as a background worker vs. in the same
// process as the API is a separate future decision.
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { pool } from "../db/pool";
import { IngestionService } from "./ingestionService";

const apiKey = process.env.FINNHUB_API_KEY;
if (!apiKey) {
  throw new Error("FINNHUB_API_KEY is not set");
}

const service = new IngestionService(apiKey);
let isShuttingDown = false;

async function shutdown(reason: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  console.log(`[run] shutting down (${reason})`);
  await service.stop();
  await pool.end();
  console.log("[run] shutdown complete");
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Optional bounded run for verification purposes; omit for normal
// (indefinite) operation, where SIGINT/SIGTERM is the real stop mechanism.
const durationArg = process.argv.find((arg) => arg.startsWith("--duration-ms="));
if (durationArg) {
  const durationMs = Number(durationArg.split("=")[1]);
  setTimeout(() => shutdown(`--duration-ms=${durationMs} elapsed`), durationMs);
}

service.start().catch((err) => {
  console.error("[run] failed to start ingestion service:", err);
  process.exit(1);
});
