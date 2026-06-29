# Music Tax Tracker

Income and expense tracking for UK musicians. Responsive on Windows, iPad, and iPhone.

## Commands to run

Open PowerShell in this folder:

```powershell
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
$env:NODE_OPTIONS = "--use-system-ca"
npm install
npm run dev
```

Open **http://localhost:3000**

| Account  | Username   | Default password |
|----------|------------|------------------|
| You      | `admin`    | `music2026`      |
| Daughter | `daughter` | `music2026`      |

## Features

- **Multi-currency** — GBP, EUR, USD, HKD, JPY with exchange rates and automatic GBP conversion
- **Receipt upload** — JPG, PNG, PDF per transaction (view from Records)
- **Dashboard** — YTD & monthly totals (always in GBP)
- **Records** — search, filter, edit, delete, dual-currency display
- **Reports** — tax year & monthly summaries, CSV & Excel export (GBP)
- **Login** — two admin accounts

## UK Tax Year

Uses HMRC tax year (6 April – 5 April), e.g. `2025/26`.

## Data storage

- Transactions: `data/db.json`
- Receipts: `data/receipts/{transactionId}/`

## Production

Set `SESSION_SECRET` in `.env.local` before deploying.
