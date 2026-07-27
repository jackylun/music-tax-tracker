const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
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

const DEFAULT_USERS = [
  {
    username: "admin",
    displayName: "Admin",
    password: process.env.ADMIN_PASSWORD || "music2026",
  },
  {
    username: "daughter",
    displayName: "Daughter",
    password: process.env.DAUGHTER_PASSWORD || "music2026",
  },
];

const EMPTY_DB = {
  users: [],
  transactions: [],
  nextUserId: 1,
  nextTransactionId: 1,
};

function seedUsers(db) {
  for (const user of DEFAULT_USERS) {
    const existing = db.users.find((u) => u.username === user.username);
    const passwordHash = bcrypt.hashSync(user.password, 10);

    if (existing) {
      existing.password_hash = passwordHash;
      existing.display_name = user.displayName;
    } else {
      db.users.push({
        id: db.nextUserId++,
        username: user.username,
        password_hash: passwordHash,
        display_name: user.displayName,
        created_at: new Date().toISOString(),
      });
    }
    console.log(`User ready: ${user.username}`);
  }
  return db;
}

async function setupNeon() {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);

  let db = { ...EMPTY_DB };
  try {
    const rows = await sql`SELECT data FROM app_storage WHERE id = 1`;
    if (rows.length > 0) {
      const raw = rows[0].data;
      db = {
        ...EMPTY_DB,
        ...(typeof raw === "string" ? JSON.parse(raw) : raw),
        users: (typeof raw === "string" ? JSON.parse(raw) : raw).users ?? [],
        transactions:
          (typeof raw === "string" ? JSON.parse(raw) : raw).transactions ?? [],
      };
    }
  } catch (error) {
    console.error(
      "Could not read Neon database. Ensure app_storage exists:",
      error.message
    );
    process.exit(1);
  }

  db = seedUsers(db);

  await sql`
    INSERT INTO app_storage (id, data)
    VALUES (1, ${JSON.stringify(db)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
  `;

  console.log("\nNeon database initialized.");
  console.log("Default password for both accounts: music2026");
  console.log(
    "Set ADMIN_PASSWORD and DAUGHTER_PASSWORD env vars to customize.\n"
  );
}

function setupLocalFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let db = { ...EMPTY_DB };
  if (fs.existsSync(DB_PATH)) {
    db = { ...db, ...JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) };
  }

  db = seedUsers(db);
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");

  console.log("\nDatabase initialized at:", DB_PATH);
  console.log("Default password for both accounts: music2026");
  console.log(
    "Set ADMIN_PASSWORD and DAUGHTER_PASSWORD env vars to customize.\n"
  );
}

async function main() {
  if (process.env.DATABASE_URL) {
    await setupNeon();
  } else {
    setupLocalFile();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
