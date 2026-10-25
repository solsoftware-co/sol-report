# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

**Phase 1 of 8: scaffold.** Ticket: https://linear.app/sol-software/issue/SOL-12. Design and the phase-by-phase plan: `sol-brain/sol-report/` (Obsidian vault), especially `02-architecture.md`, `03-implementation-plan.md` and `04-contract-analytics-report.md`. What exists today: `/health`, a daily cron tick that only logs, and a `ReportWorkflow` that only logs. The next phase (2) makes the tick find due reports and start sleeping Workflows.

## Role

**Builds and sends each site's scheduled analytics report**, replacing the old `sol-notificaiton-service`'s Inngest analytics schedulers. Internal-only: **nothing calls it**. It runs on a cron and calls sol-api and (from phase 6) sol-notify through service bindings.

- **Daily scheduler:** a cron at **00:00 UTC**. It lists enabled reports for active clients (`GET /v1/analytics-reports?enabled=true&active=true`) and finds each report's next `cron` occurrence(s) in the client's IANA timezone within `[scheduledTime, scheduledTime + 24h)`. For each one it starts a `ReportWorkflow`. The window comes from `controller.scheduledTime`, never `Date.now()`. Why daily rather than hourly: `sol-brain/sol-report/decisions/decision-daily-tick-with-sleep.md`.
- **ReportWorkflow:** one instance per occurrence. It `sleepUntil`s the send time and re-checks the report is still enabled and the client still active. It then fetches GA4, builds the display-ready `analytics_report` fields, renders charts + .xlsx into R2, resolves recipients from the report's channels, calls sol-notify and writes `last_run_at`.
- **sol-notify stays dumb.** All analytics logic, formatting, charts and the .xlsx live here. sol-notify only renders the fields it's given and attaches R2 files.

## Commands

```bash
npm run dev        # wrangler dev --test-scheduled on http://localhost:8791
                   #   trigger a tick: curl "http://localhost:8791/__scheduled?cron=0+0+*+*+*"
npm test           # unit tests, vitest via @cloudflare/vitest-pool-workers (tests/e2e excluded)
npm run test:e2e   # e2e suite in plain Node against PREVIEW_URL (skips if unset)
npm run type-check # tsc --noEmit
npm run deploy     # deploy to Cloudflare Workers
```

## Environments

`ENVIRONMENT` must be one of `development | preview | staging | production` (`src/lib/environment.ts`, same as the other services). Anything else fails every request (including `/health`) and every tick.

| ENVIRONMENT | Worker | Cron | `SOL_API` | Workflow | Public URL |
|---|---|---|---|---|---|
| `development` | local `npm run dev` | none (trigger by hand) | `sol-api` (local `wrangler dev`) | `sol-report-run-dev` (local) | localhost |
| `preview` | `sol-report-pr-<N>` | **none** | `sol-api-dev` | `sol-report-run-pr-<N>` | yes, `/health` only |
| `staging` | `sol-report-staging` | `0 0 * * *` | `sol-api-staging` | `sol-report-run-staging` | **none** |
| `production` | `sol-report` | `0 0 * * *` | `sol-api` | `sol-report-run` | **none** |

- **Previews:** `.github/workflows/pr.yml` deploys one on every same-repo PR (fork PRs are skipped because they get no secrets). It names both the Worker and its workflow per PR by rewriting `wrangler.toml` in the runner's checkout. `cleanup.yml` deletes both when the PR closes; the workflow needs a Cloudflare API call, since wrangler 3 has no `workflows delete`.
- **Staging and production:** staging deploys from `release.yml` on every merge to `main`. Production is the same workflow's `deploy-production` job, gated behind the `production` GitHub Environment (required reviewer).

GitHub secrets required: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `RELEASE_TOKEN`. No Worker secrets yet. `SOL_API_KEY` arrives with phase 2. At that point the preview deploy must switch to sol-integrate's deploy → `secret bulk` → redeploy sequence, so code and secrets go live together.

Not bound yet: `SOL_NOTIFY` (phase 6) and the `REPORTS` R2 bucket (phase 5). R2 still has to be enabled on the Cloudflare account; the planned buckets are `sol-reports-preview`, `sol-reports-staging` and `sol-reports`, shared with sol-notify's SOL-55.

## Architecture

**Stack:** Hono 4.x (only for `/health`) + a `scheduled()` handler + a Workflow class, on Cloudflare Workers. No database: report config, GA4 credentials and channels all live behind sol-api.

### Source layout

```
src/
├── index.ts               # exports { fetch (/health), scheduled } and ReportWorkflow
├── routes/health.ts       # GET /health
├── scheduler/tick.ts      # runTick(): the daily tick
├── workflows/report.ts    # ReportWorkflow (one instance per report occurrence)
├── lib/
│   ├── environment.ts     # ENVIRONMENT enum
│   ├── log-context.ts     # environment, traceId, analyticsReportId on every log line
│   └── logger.ts          # structured JSON logger with key/token/secret redaction
└── types/index.ts         # Env bindings
tests/
├── unit/                  # Workers pool (vitest.config.ts) — no wrangler.toml, see below
└── e2e/                   # plain Node vs. a deployed preview (vitest.e2e.config.ts)
```

### Rules

- **The unit tests don't load `wrangler.toml`.** `@cloudflare/vitest-pool-workers` 0.5.x (matching wrangler 3) can't run Workflows and refuses to start with the `REPORT_WORKFLOW` binding. This is the same as sol-gate. Tests pass their own env (`tests/unit/helpers.ts`). Keep the miniflare compatibility settings in `vitest.config.ts` in sync with `wrangler.toml`.
- **`scheduled()` awaits the tick** (no `waitUntil`), so a tick that throws shows as a failed cron run. A failed tick loses that day's reports.
- **Workflow code outside `step.do()` re-runs whenever an instance resumes**, so keep it deterministic: no I/O, no randomness, no `Date.now()`. Step names must be unique and stable per instance. Never return image/file bytes from a step: upload to R2 inside the step and return the key.
- **No dedicated types files.** A type lives in the file that owns the concept (e.g. `ReportParams` in `workflows/report.ts`). `types/index.ts` holds only `Env`.
