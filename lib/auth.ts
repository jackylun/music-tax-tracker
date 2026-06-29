import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { findUserByUsername, hashPassword, verifyPassword } from "./auth-db";

export { findUserByUsername, hashPassword, verifyPassword };

const SESSION_COOKIE = "mtt_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecret() {
  const secret = process.env.SESSION_SECRET || "dev-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

export interface SessionUser {
  id: number;
  username: string;
  displayName: string;
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: payload.id as number,
      username: payload.username as string,
      displayName: payload.displayName as string,
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
