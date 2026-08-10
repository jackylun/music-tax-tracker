/**
 * Read-only Neon snapshot for before/after verification.
 * Run: node scripts/snapshot-neon.js
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`SELECT data FROM app_storage WHERE id = 1`;

  if (rows.length === 0) {
    console.log(JSON.stringify({ count: 0, hash: null, nextTransactionId: null }));
    return;
  }

  const raw = rows[0].data;
  const db = typeof raw === "string" ? JSON.parse(raw) : raw;
  const txs = db.transactions ?? [];
  const canonical = JSON.stringify(txs);
  const hash = crypto.createHash("sha256").update(canonical).digest("hex");

  console.log(
    JSON.stringify(
      {
        transactionCount: txs.length,
        nextTransactionId: db.nextTransactionId ?? null,
        dataHash: hash.slice(0, 16),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
