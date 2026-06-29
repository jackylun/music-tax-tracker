import { NextRequest, NextResponse } from "next/server";
import { createSession, findUserByUsername, verifyPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password required" },
        { status: 400 }
      );
    }

    const user = findUserByUsername(username.trim().toLowerCase());
    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await createSession({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
    });

    return NextResponse.json({
      user: { username: user.username, displayName: user.display_name },
    });
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
