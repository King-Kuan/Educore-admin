import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole, getSession } from "@/lib/api";
import { Timestamp } from "firebase-admin/firestore";

export async function GET(request: Request) {
  const { claims, error } = await getSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get("schoolId") ?? claims!.schoolId;
  const classId  = searchParams.get("classId");
  const levelId  = searchParams.get("levelId");

  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  try {
    // Resolve levelId from classId if needed
    let targetLevelId = levelId;
    if (classId && !levelId) {
      const classDoc = await adminDb
        .collection("schools").doc(schoolId)
        .collection("classes").doc(classId)
        .get();
      targetLevelId = classDoc.data()?.["levelId"] ?? null;
    }

    // No orderBy — avoids composite index requirement
    let snap;
    if (targetLevelId) {
      snap = await adminDb
        .collection("schools").doc(schoolId)
        .collection("subjects")
        .where("levelId", "==", targetLevelId)
        .get();
    } else {
      snap = await adminDb
        .collection("schools").doc(schoolId)
        .collection("subjects")
        .get();
    }

    const subjects = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (Number(a["order"]) || 0) - (Number(b["order"]) || 0));

    return NextResponse.json({ subjects, total: subjects.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { claims, error } = await requireRole("principal", "superadmin");
  if (error) return error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const schoolId = (claims!.schoolId ?? body["schoolId"]) as string;
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  const { name, levelId, caMax, examMax } = body;
  if (!name || !levelId || caMax === undefined || examMax === undefined) {
    return NextResponse.json({ error: "name, levelId, caMax, examMax required" }, { status: 400 });
  }

  try {
    // Get current subject count for order
    const existingSnap = await adminDb
      .collection("schools").doc(schoolId)
      .collection("subjects")
      .where("levelId", "==", levelId)
      .get();

    const now = Timestamp.now();
    const ref = await adminDb
      .collection("schools").doc(schoolId)
      .collection("subjects")
      .add({
        schoolId,
        name:     String(name).trim(),
        levelId,
        caMax:    Number(caMax),
        examMax:  Number(examMax),
        totalMax: Number(caMax) + Number(examMax),
        order:    existingSnap.size,
        createdAt: now,
        updatedAt: now,
      });

    return NextResponse.json({ id: ref.id, name }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to create subject: ${msg}` }, { status: 500 });
  }
}
