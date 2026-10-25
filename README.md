# sol-report

Internal Cloudflare Worker that builds and sends each site's scheduled **analytics report**. A daily 00:00 UTC cron finds the reports due in the next 24 hours and starts one Workflow per report. Each Workflow sleeps until the client's local send time, builds the report from GA4 (stats, charts, .xlsx) and has sol-notify email it. It replaces the old notification service's Inngest analytics jobs (SOL-12). Staging and production have no public URL.

```bash
cp .dev.vars.example .dev.vars
npm install
npm run dev   # http://localhost:8791 — trigger a tick with /__scheduled
npm test
```

See [CLAUDE.md](./CLAUDE.md) for the flow, environments and rules.
