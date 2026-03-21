import { NextResponse } from "next/server";
import { adminDb, createAuthUser, setUserClaims } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/api";
import { sendPrincipalWelcome } from "@/lib/email/sender";
import { Timestamp } from "firebase-admin/firestore";
import { getCurrentAcademicYear } from "@/lib/utils/helpers";

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

export async function POST(request: Request) {
  const { claims, error } = await requireRole("superadmin");
  if (error) return error;

  // Safe JSON parse
  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
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

  // STEP 1 — Create school document
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

  // STEP 2 — Create principal Firebase Auth user
  let uid = "";
  let tempPassword = "";
  try {
    const result = await createAuthUser(principalEmail, principalName);
    uid          = result.uid;
    tempPassword = result.tempPassword;
  } catch (authErr) {
    // Rollback school creation so no orphaned records
    try { await schoolRef.delete(); } catch { /* ignore */ }
    const msg = authErr instanceof Error ? authErr.message : String(authErr);
    return NextResponse.json({ error: `Failed to create principal account: ${msg}` }, { status: 500 });
  }

  // STEP 3 — Set custom claims (role-based access)
  try {
    await setUserClaims(uid, { role: "principal", schoolId: schoolRef.id, permissions: [] });
  } catch (claimsErr) {
    console.error("setUserClaims failed (non-fatal):", claimsErr);
  }

  // STEP 4 — Write user document to Firestore
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
  } catch (userErr) {
    console.error("Writing user doc failed (non-fatal):", userErr);
  }

  // STEP 5 — Send welcome email (NEVER crashes the response)
  let emailSent  = false;
  let emailError = "";
  try {
    await sendPrincipalWelcome({
      toEmail:       principalEmail,
      principalName,
      schoolName:    name,
      tempPassword,
    });
    emailSent = true;
  } catch (emailErr) {
    emailError = emailErr instanceof Error ? emailErr.message : String(emailErr);
    console.error("Welcome email failed (non-fatal):", emailError);
  }

  return NextResponse.json({
    ok:           true,
    schoolId:     schoolRef.id,
    principalUid: uid,
    tempPassword,
    emailSent,
    emailError:   emailSent ? null : emailError,
    message:      emailSent
      ? `School created. Welcome email sent to ${principalEmail}`
      : `School created. Email failed: ${emailError}. Temp password: ${tempPassword}`,
  }, { status: 201 });
}
