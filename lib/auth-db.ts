import bcrypt from "bcryptjs";
import { readDb, type DbUser } from "./db";

export async function findUserByUsername(
  username: string
): Promise<DbUser | undefined> {
  const db = await readDb();
  return db.users.find((u) => u.username === username);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash);
}

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}
