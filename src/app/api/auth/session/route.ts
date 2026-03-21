import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// POST /api/auth/session — store Firebase ID token in httpOnly cookie
export async function POST(request: Request) {
  const { token } = await request.json();
  if (!token) return NextResponse.json({ error: "No token" }, { status: 400 });

  const cookieStore = await cookies();
  cookieStore.set("__session", token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 7, // 7 days
    path:     "/",
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/auth/session — sign out
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("__session");
  return NextResponse.json({ ok: true });
}
