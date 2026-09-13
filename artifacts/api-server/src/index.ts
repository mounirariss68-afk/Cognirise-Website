import app from "./app";
import { logger } from "./lib/logger";
import { startAccessDeliveryWorker } from "./lib/access-delivery";
import { runReadinessChecks } from "./routes/health";
import { startEditorialWorkWorker } from "./lib/editorial-work";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  void runReadinessChecks().then((readiness) => {
    if (readiness.status !== "ok") {
      logger.warn({ checks: readiness.checks }, "API startup readiness check is unavailable");
    }
  });
  startAccessDeliveryWorker();
  startEditorialWorkWorker();
});
