/**
 * Preview or apply FX recalculation for legacy foreign transactions.
 * Default: dry-run only (no writes).
 * Apply: node scripts/recalculate-fx.js --apply  (NOT run automatically)
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ENV_LOCAL = path.join(ROOT, ".env.local");
const APPLY = process.argv.includes("--apply");

function loadEnvLocal() {
  if (!fs.existsSync(ENV_LOCAL)) return;
  for (const line of fs.readFileSync(ENV_LOCAL, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

async function fetchGbpRate(currency, date) {
  const endpoint = `https://api.frankfurter.app/${date}?from=${currency}&to=GBP`;
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${currency} on ${date}`);
  }
  const data = await response.json();
  const rate = data.rates?.GBP;
  if (rate == null || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(`No rate for ${currency} on ${date}`);
  }
  return { rate, rateDate: data.date ?? date };
}

function roundMoney(n) {
  return Math.round(n * 100) / 100;
}

function roundJpy(n) {
  return Math.round(n);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);

  const rows = await sql`SELECT data FROM app_storage WHERE id = 1`;
  if (rows.length === 0) {
    console.log("No data.");
    return;
  }

  const raw = rows[0].data;
  const db = typeof raw === "string" ? JSON.parse(raw) : raw;
  const transactions = db.transactions ?? [];

  let changes = 0;
  let skipped = 0;
  let errors = 0;

  console.log(APPLY ? "\nAPPLY mode — will write to Neon\n" : "\nDRY-RUN — no writes\n");

  for (const t of transactions) {
    const currency = t.currency ?? "GBP";
    if (currency === "GBP") continue;

    const manual =
      Boolean(t.rate_manual_override) || Boolean(t.gbp_manual_override);
    const rate = Number(t.exchange_rate ?? 1);

    if (manual || rate !== 1) {
      skipped++;
      continue;
    }

    try {
      const { rate: newRate, rateDate } = await fetchGbpRate(
        currency,
        t.date
      );
      const original =
        currency === "JPY"
          ? roundJpy(Number(t.original_amount))
          : roundMoney(Number(t.original_amount));
      const newGbp = roundMoney(original * newRate);

      console.log(
        `  id=${t.id} ${t.date} ${currency} ${original}: ${rate} -> ${newRate} (£${t.amount_gbp ?? t.amount} -> £${newGbp}) date=${rateDate}`
      );

      if (APPLY) {
        t.exchange_rate = newRate;
        t.amount_gbp = newGbp;
        t.amount = newGbp;
        t.exchange_rate_date = rateDate;
        t.rate_source = "frankfurter";
        t.rate_manual_override = false;
        t.gbp_manual_override = false;
      }
      changes++;
    } catch (err) {
      console.error(`  id=${t.id} ERROR: ${err.message}`);
      errors++;
    }
  }

  if (APPLY && changes > 0) {
    await sql`
      INSERT INTO app_storage (id, data)
      VALUES (1, ${JSON.stringify(db)}::jsonb)
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `;
    console.log(`\nSaved ${changes} updated transaction(s) to Neon.`);
  } else {
    console.log(`\nWould update: ${changes}, skipped: ${skipped}, errors: ${errors}`);
    if (!APPLY) {
      console.log("Run with --apply to persist changes (not done in this deployment).");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
