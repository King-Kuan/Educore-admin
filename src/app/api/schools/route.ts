import { NextResponse } from "next/server";
import { adminDb, createAuthUser, setUserClaims } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/api";
import { sendPrincipalWelcome } from "@/lib/email/sender";
import { Timestamp } from "firebase-admin/firestore";
import { getCurrentAcademicYear } from "@/lib/utils/helpers";

// GET /api/schools
export async function GET(request: Request) {
  const { claims, error } = await requireRole("superadmin", "principal");
  if (error) return error;

  let snap;
  if (claims!.role === "superadmin") {
    snap = await adminDb.collection("schools").orderBy("createdAt", "desc").get();
  } else {
    snap = await adminDb.collection("schools").where("__name__", "==", claims!.schoolId).get();
  }

  const schools = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ schools, total: schools.length });
}

// POST /api/schools
export async function POST(request: Request) {
  const { claims, error } = await requireRole("superadmin");
  if (error) return error;

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, abbreviation, code, email, phone, district, principalName, principalEmail } = body;

  if (!name || !abbreviation || !code || !email || !principalEmail || !principalName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check code uniqueness
  const existing = await adminDb.collection("schools").where("code", "==", code).limit(1).get();
  if (!existing.empty) {
    return NextResponse.json({ error: `School code ${code} already taken` }, { status: 409 });
  }

  const now = Timestamp.now();

  // Step 1 — Create school
  const schoolRef = adminDb.collection("schools").doc();
  await schoolRef.set({
    name,
    abbreviation:       abbreviation.toUpperCase(),
    code:               code.padStart(3, "0"),
    email,
    phone:              phone ?? "",
    address:            "",
    district:           district ?? "",
    province:           "",
    country:            "Rwanda",
    planType:           "flat",
    studentCount:       0,
    subscriptionStatus: "trial",
    subscriptionExpiry: null,
    approvedAt:         now,
    approvedBy:         claims!.uid,
    isActive:           true,
    logoUrl:            null,
    createdAt:          now,
    updatedAt:          now,
  });

  // Step 2 — Create principal auth user
  let uid = "";
  let tempPassword = "";
  try {
    const result = await createAuthUser(principalEmail, principalName);
    uid          = result.uid;
    tempPassword = result.tempPassword;
  } catch (err) {
    // Auth user creation failed — delete school to keep data clean
    await schoolRef.delete();
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Failed to create principal account: ${msg}` }, { status: 500 });
  }

  // Step 3 — Set custom claims
  try {
    await setUserClaims(uid, { role: "principal", schoolId: schoolRef.id, permissions: [] });
  } catch (err) {
    console.error("setUserClaims failed:", err);
    // Not fatal — user can still log in, claims can be set manually
  }

  // Step 4 — Write user doc to Firestore
  try {
    await adminDb.collection("users").doc(uid).set({
      uid,
      email:       principalEmail,
      displayName: principalName,
      photoUrl:    null,
      role:        "principal",
      schoolId:    schoolRef.id,
      permissions: [],
      status:      "active",
      createdBy:   claims!.uid,
      createdAt:   now,
      lastLoginAt: null,
    });
  } catch (err) {
    console.error("Writing user doc failed:", err);
    // Not fatal — school and auth user exist
  }

  // Step 5 — Send welcome email (never crash the response)
  let emailSent  = false;
  let emailError = "";
  try {
    await sendPrincipalWelcome({ toEmail: principalEmail, principalName, schoolName: name, tempPassword });
    emailSent = true;
  } catch (err) {
    emailError = err instanceof Error ? err.message : "Email failed";
    console.error("Welcome email failed:", emailError);
  }

  // Always return success with tempPassword visible so you can share it manually if email fails
  return NextResponse.json({
    ok:           true,
    schoolId:     schoolRef.id,
    principalUid: uid,
    tempPassword,
    emailSent,
    emailError:   emailSent ? null : emailError,
    message:      emailSent
      ? `School created. Welcome email sent to ${principalEmail}`
      : `School created. Email failed (${emailError}). Share this temp password manually: ${tempPassword}`,
  }, { status: 201 });
}
