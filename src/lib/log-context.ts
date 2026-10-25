import { AsyncLocalStorage } from "node:async_hooks";

// Fields every log line carries without each call passing them (same idea as
// SOL-46 in the other services):
// - environment: the Worker's ENVIRONMENT, so Workers Observability can
//   filter by it.
// - traceId: one run of work. A scheduler tick starts one, and each report
//   Workflow it creates keeps it, so a report's lines can be traced back to
//   the tick that scheduled it, and forward into sol-api / sol-notify.
// - analyticsReportId: the report a Workflow run is for. Only on lines that
//   are for one report.
//
// AsyncLocalStorage carries the scope through every await below withLogScope.
// A Workflow step's callback runs in a fresh async context, so steps re-enter
// it themselves.
export interface LogScope {
  environment?: string;
  traceId?: string;
  analyticsReportId?: string;
}

export const TRACE_ID_HEADER = "X-Trace-Id";

const storage = new AsyncLocalStorage<LogScope>();

/** Runs `fn` with `scope` added to the current one. */
export function withLogScope<T>(scope: LogScope, fn: () => T): T {
  return storage.run({ ...currentLogScope(), ...scope }, fn);
}

export function currentLogScope(): LogScope {
  return storage.getStore() ?? {};
}

/** The current trace id, as a header for a call to another internal service. */
export function traceHeaders(): Record<string, string> {
  const { traceId } = currentLogScope();
  return traceId ? { [TRACE_ID_HEADER]: traceId } : {};
}
