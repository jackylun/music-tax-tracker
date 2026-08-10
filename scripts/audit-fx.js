/**
 * Audit foreign-currency transactions that may have incorrect 1:1 rates.
 * Read-only — does not modify Neon.
 * Run: node scripts/audit-fx.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ENV_LOCAL = path.join(ROOT, ".env.local");

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

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set (.env.local or environment)");
    process.exit(1);
  }

  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);

  const rows = await sql`SELECT data FROM app_storage WHERE id = 1`;
  if (rows.length === 0) {
    console.log("No app_storage data found.");
    return;
  }

  const raw = rows[0].data;
  const db = typeof raw === "string" ? JSON.parse(raw) : raw;
  const transactions = db.transactions ?? [];

  const suspicious = [];
  const foreign = [];

  for (const t of transactions) {
    const currency = t.currency ?? "GBP";
    if (currency === "GBP") continue;

    foreign.push(t);

    const rate = Number(t.exchange_rate ?? 1);
    const manual =
      Boolean(t.rate_manual_override) || Boolean(t.gbp_manual_override);

    if (rate === 1 && !manual) {
      suspicious.push({
        id: t.id,
        date: t.date,
        currency,
        original_amount: t.original_amount,
        exchange_rate: rate,
        amount_gbp: t.amount_gbp ?? t.amount,
        rate_source: t.rate_source ?? "(none)",
        manual,
      });
    }
  }

  console.log(`\nFX audit (read-only)`);
  console.log(`Total transactions: ${transactions.length}`);
  console.log(`Foreign-currency: ${foreign.length}`);
  console.log(`Suspicious 1:1 (non-manual): ${suspicious.length}\n`);

  if (suspicious.length === 0) {
    console.log("No suspicious auto 1:1 foreign rates found.");
  } else {
    console.log("Suspicious records:");
    for (const s of suspicious) {
      console.log(
        `  id=${s.id} ${s.date} ${s.currency} ${s.original_amount} @ ${s.exchange_rate} -> £${s.amount_gbp} source=${s.rate_source}`
      );
    }
    console.log(
      "\nThese are legacy records — use recalculate-fx.js (dry-run) to preview fixes."
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
