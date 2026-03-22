import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole, getSession } from "@/lib/api";
import { Timestamp } from "firebase-admin/firestore";

// GET /api/levels?schoolId=
export async function GET(request: Request) {
  const { claims, error } = await getSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get("schoolId") ?? claims!.schoolId;
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  const snap   = await adminDb
    .collection("schools").doc(schoolId)
    .collection("schoolLevels")
    .orderBy("order")
    .get();

  const levels = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ levels });
}

// POST /api/levels
export async function POST(request: Request) {
  const { claims, error } = await requireRole("principal", "superadmin");
  if (error) return error;

  const body     = await request.json();
  const schoolId = claims!.schoolId ?? body.schoolId;
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  const { name, gradingType = "percentage", passMark = 50, descriptors } = body;
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  // Get next order
  const existing = await adminDb
    .collection("schools").doc(schoolId)
    .collection("schoolLevels").get();

  const ref = await adminDb
    .collection("schools").doc(schoolId)
    .collection("schoolLevels")
    .add({
      schoolId,
      name,
      gradingType,
      passMark,
      descriptors: descriptors ?? (gradingType === "descriptors"
        ? ["Excellent", "Very Good", "Good", "Satisfactory"]
        : []),
      order:     existing.size,
      createdAt: Timestamp.now(),
    });

  return NextResponse.json({ id: ref.id }, { status: 201 });
}
