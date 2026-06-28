# Smart Water Filter Monitoring

A dashboard for plumbers to monitor **Restmo BT smart water meters** (via Tuya)
across commercial and residential customers, visualize water usage, set
per-filter gallon limits, and text customers when a filter needs changing.

test

## What it does

- **Link Tuya accounts** — connect one or more Smart Life / Tuya app accounts and
  import their water meters automatically.
- **Multi-device fleet** — group meters by Commercial / Residential customer.
- **Filter tracking** — set a replacement limit in gallons per device; the app
  accumulates usage from the meter's cumulative counter and shows % to replacement.
- **Data viz** — cumulative usage and daily-usage charts per device.
- **SMS alerts** — texts the customer's contact phone (via Twilio) at 90% of the
  limit and again when the filter is due. Each alert fires once per filter cycle.
- **Mark filter changed** — resets the usage baseline and re-arms alerts.

The Restmo meter reports volume in 0.1 L units (`water_use_data`), which the app
converts to US gallons (`lib/units.ts`).

## Tech

Next.js 16 (App Router, Server Actions) · Prisma 7 + Postgres (pg driver adapter) ·
Tuya Cloud API · Twilio · Tailwind CSS v4. Charts are dependency-free SVG.

## Setup

1. **Env** — copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — Postgres (local or a Neon pooled connection string)
   - `TUYA_ACCESS_KEY` / `TUYA_SECRET_KEY` — from iot.tuya.com → Cloud Project → Authorization Key
   - `TWILIO_*` — optional; leave blank to disable SMS (alerts log as "skipped")
   - `CRON_SECRET` — optional; protects the cron endpoint

2. **Database**

   ```bash
   pnpm install          # also runs `prisma generate`
   pnpm db:migrate       # apply migrations (prisma migrate deploy)
   ```

   For a local DB: `createdb flowguard` then
   `DATABASE_URL="postgresql://<user>@localhost:5432/flowguard"`.

3. **Run**
   ```bash
   pnpm dev
   ```
   Then open http://localhost:3000 → **Settings** to link a Tuya account
   (you'll need the app-account **UID** from iot.tuya.com → Cloud Project →
   Devices → Link Tuya App Account).

## Polling

Readings are captured when you click **Refresh** on a device, and on a schedule
via `GET /api/cron/poll`. On Vercel this is wired by `vercel.json` (every 30 min)
and protected by `CRON_SECRET`. Locally you can hit it directly:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/poll
```

## Handy scripts

- `pnpm devices` — list devices on the linked Tuya account (reads keys from `.env`)
- `pnpm db:studio` — browse the database with Prisma Studio

## Deploying to Vercel

1. Provision Postgres (e.g. Neon) and set `DATABASE_URL` to the pooled string.
2. Set all env vars in the Vercel project (incl. `CRON_SECRET`).
3. Deploy — `pnpm build` runs `prisma generate` automatically. Run
   `pnpm db:migrate` against the production DB once.
4. The cron in `vercel.json` polls every device every 30 minutes.
