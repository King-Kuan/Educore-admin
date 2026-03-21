import { NextResponse } from "next/server";
import { adminDb, adminAuth, createAuthUser, setUserClaims } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/api";
import { sendTeacherInvite } from "@/lib/email/sender";
import { Timestamp } from "firebase-admin/firestore";

// GET /api/teachers?schoolId=xxx
export async function GET(request: Request) {
  const { claims, error } = await requireRole("principal", "deputy", "superadmin");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get("schoolId") ?? claims!.schoolId;
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  const snap = await adminDb
    .collection("users")
    .where("schoolId", "==", schoolId)
    .where("role", "in", ["teacher", "deputy"])
    .get();

  const teachers = snap.docs.map((d) => ({
    uid:         d.id,
    ...d.data(),
    // Remove sensitive data
    permissions: (d.data()["permissions"] as string[]) ?? [],
  }));

  return NextResponse.json({ teachers, total: teachers.length });
}

// POST /api/teachers - invite a new teacher
// Body: { email, displayName, role: "teacher"|"deputy", permissions?: string[] }
export async function POST(request: Request) {
  const { claims, error } = await requireRole("principal", "superadmin");
  if (error) return error;

  const body     = await request.json();
  const schoolId = claims!.schoolId ?? body.schoolId;
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  const { email, displayName, role = "teacher", permissions = [] } = body;
  if (!email || !displayName) {
    return NextResponse.json({ error: "email and displayName required" }, { status: 400 });
  }

  // Check not already registered
  try {
    await adminAuth.getUserByEmail(email);
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  } catch {
    // Not found — good, proceed
  }

  // Get school + principal name
  const [schoolDoc, principalDoc] = await Promise.all([
    adminDb.collection("schools").doc(schoolId).get(),
    adminDb.collection("users").doc(claims!.uid).get(),
  ]);

  const schoolName    = schoolDoc.data()?.name ?? "Your School";
  const principalName = principalDoc.data()?.displayName ?? "The Principal";

  // Create Firebase Auth user with temp password
  const { uid, tempPassword } = await createAuthUser(email, displayName);

  // Set custom claims (role + schoolId)
  await setUserClaims(uid, { role, schoolId, permissions });

  // Write user doc to Firestore
  await adminDb.collection("users").doc(uid).set({
    uid,
    email,
    displayName,
    photoUrl:    null,
    role,
    schoolId,
    permissions,
    status:      "active",
    createdBy:   claims!.uid,
    createdAt:   Timestamp.now(),
    lastLoginAt: null,
  });

  // Send invite email — never crashes the response
  let emailSent  = false;
  let emailError = "";
  try {
    await sendTeacherInvite({
      toEmail:       email,
      teacherName:   displayName,
      schoolName,
      principalName,
      tempPassword,
    });
    emailSent = true;
  } catch (emailErr) {
    emailError = emailErr instanceof Error ? emailErr.message : String(emailErr);
    console.error("Teacher invite email failed (non-fatal):", emailError);
  }

  return NextResponse.json({
    uid, email, displayName, role,
    tempPassword,
    emailSent,
    emailError: emailSent ? null : emailError,
  }, { status: 201 });
}

// PATCH /api/teachers - update permissions / status
export async function PATCH(request: Request) {
  const { claims, error } = await requireRole("principal", "superadmin");
  if (error) return error;

  const body = await request.json();
  const { uid, permissions, status } = body;
  if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (permissions !== undefined) updates["permissions"] = permissions;
  if (status !== undefined)      updates["status"] = status;

  await adminDb.collection("users").doc(uid).update(updates);

  // Update claims if permissions changed
  if (permissions !== undefined) {
    const userDoc = await adminDb.collection("users").doc(uid).get();
    await setUserClaims(uid, {
      role:        userDoc.data()?.["role"],
      schoolId:    userDoc.data()?.["schoolId"],
      permissions: permissions,
    });
  }

  return NextResponse.json({ ok: true });
}
