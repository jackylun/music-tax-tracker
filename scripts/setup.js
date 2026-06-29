const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const users = [
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

let db = { users: [], transactions: [], nextUserId: 1, nextTransactionId: 1 };

if (fs.existsSync(DB_PATH)) {
  db = { ...db, ...JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) };
}

for (const user of users) {
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

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");

console.log("\nDatabase initialized at:", DB_PATH);
console.log("Default password for both accounts: music2026");
console.log("Set ADMIN_PASSWORD and DAUGHTER_PASSWORD env vars to customize.\n");
