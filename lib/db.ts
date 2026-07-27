import { neon } from "@neondatabase/serverless";

export interface DbUser {
  id: number;
  username: string;
  password_hash: string;
  display_name: string;
  created_at: string;
}

/** Raw transaction as stored in the database (supports legacy fields). */
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

const sql = neon(process.env.DATABASE_URL!);

function normalizeDbData(raw: Partial<DbData> | null | undefined): DbData {
  return {
    ...EMPTY_DB,
    ...raw,
    users: raw?.users ?? [],
    transactions: raw?.transactions ?? [],
    nextUserId: raw?.nextUserId ?? EMPTY_DB.nextUserId,
    nextTransactionId: raw?.nextTransactionId ?? EMPTY_DB.nextTransactionId,
  };
}

export async function getDatabase(): Promise<DbData> {
  try {
    const rows = await sql`SELECT data FROM app_storage WHERE id = 1`;
    if (rows.length === 0) {
      return { ...EMPTY_DB };
    }
    const data = rows[0].data as Partial<DbData> | string;
    const parsed =
      typeof data === "string" ? (JSON.parse(data) as Partial<DbData>) : data;
    return normalizeDbData(parsed);
  } catch (error) {
    console.error("Database fetch error:", error);
    return { ...EMPTY_DB };
  }
}

export async function saveDatabase(data: DbData): Promise<void> {
  try {
    await sql`
      INSERT INTO app_storage (id, data)
      VALUES (1, ${JSON.stringify(data)}::jsonb)
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `;
  } catch (error) {
    console.error("Database save error:", error);
    throw error;
  }
}

/** Read full app state from Neon. */
export async function readDb(): Promise<DbData> {
  return getDatabase();
}

/** Persist full app state to Neon. */
export async function writeDb(data: DbData): Promise<void> {
  await saveDatabase(data);
}
