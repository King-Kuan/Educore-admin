import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

    const decoded = await verifyIdToken(token);
    const role = decoded["role"] as string ?? null;

    if (!role) {
      return NextResponse.json({ error: "No role claim" }, { status: 403 });
    }

    return NextResponse.json({ uid: decoded.uid, role, schoolId: decoded["schoolId"] ?? null });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
