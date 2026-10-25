import { Hono } from "hono";
import health from "./routes/health.js";
import { parseEnvironment } from "./lib/environment.js";
import { logger } from "./lib/logger.js";
import { runTick } from "./scheduler/tick.js";
import type { AppEnv, Env } from "./types/index.js";

export { ReportWorkflow } from "./workflows/report.js";

// sol-report has no callers: it runs on its cron (scheduled below). The only
// route is /health, which CI uses to know a deploy is serving.
const app = new Hono<AppEnv>();

app.onError((err, c) => {
  logger.error("unhandled error", { errorMessage: err.message });
  return c.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, 500);
});
app.notFound((c) => c.json({ success: false, error: { code: "NOT_FOUND", message: "Not found" } }, 404));

app.use("*", async (c, next) => {
  // Fail fast on a misconfigured ENVIRONMENT, including /health.
  parseEnvironment(c.env.ENVIRONMENT);
  await next();
});

app.route("/health", health);

export default {
  fetch: app.fetch,
  // Awaited, not waitUntil'd: a tick that throws then shows as a failed cron
  // run in the dashboard — the signal alerting watches (a failed tick loses
  // that day's reports).
  async scheduled(controller, env) {
    await runTick(controller, env);
  },
} satisfies ExportedHandler<Env>;
