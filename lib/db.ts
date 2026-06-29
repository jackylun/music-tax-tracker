import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

export interface DbUser {
  id: number;
  username: string;
  password_hash: string;
  display_name: string;
  created_at: string;
}

/** Raw transaction as stored in db.json (supports legacy fields). */
export type StoredTransaction = Record<string, unknown> & { id: number };

export interface DbData {
  users: DbUser[];
  transactions: StoredTransaction[];
  nextUserId: number;
  nextTransactionId: number;
}

const EMPTY_DB: DbData = {
  users: [],
  transactions: [],
  nextUserId: 1,
  nextTransactionId: 1,
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readDb(): DbData {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) {
    return { ...EMPTY_DB, users: [], transactions: [] };
  }
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return { ...EMPTY_DB, ...JSON.parse(raw) };
}

export function writeDb(data: DbData) {
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function getDbPath() {
  return DB_PATH;
}
