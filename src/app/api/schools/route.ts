import { NextResponse } from "next/server";
import { adminDb, createAuthUser, setUserClaims } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/api";
import { sendPrincipalWelcome } from "@/lib/email/sender";
import { Timestamp } from "firebase-admin/firestore";
import { getCurrentAcademicYear } from "@/lib/utils/helpers";

// GET /api/schools — superadmin gets all; principal gets own
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

// POST /api/schools — superadmin creates a school + its principal account
export async function POST(request: Request) {
  const { claims, error } = await requireRole("superadmin");
  if (error) return error;

  const body = await request.json();
  const { name, abbreviation, code, email, phone, district, principalName, principalEmail } = body;

  if (!name || !abbreviation || !code || !email || !principalEmail || !principalName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check code uniqueness
  const existing = await adminDb.collection("schools").where("code", "==", code).limit(1).get();
  if (!existing.empty) {
    return NextResponse.json({ error: `School code ${code} already taken` }, { status: 409 });
  }

  const now          = Timestamp.now();
  const academicYear = getCurrentAcademicYear();

  // 1. Create school document
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

  // 2. Create principal Firebase Auth user
  const { uid, tempPassword } = await createAuthUser(principalEmail, principalName);

  // 3. Set role claims
  await setUserClaims(uid, {
    role:        "principal",
    schoolId:    schoolRef.id,
    permissions: [],
  });

  // 4. Write user doc
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

  // 5. Send welcome email — wrapped so it never crashes the response
  let emailSent  = true;
  let emailError = "";
  try {
    await sendPrincipalWelcome({
      toEmail:       principalEmail,
      principalName,
      schoolName:    name,
      tempPassword,
    });
  } catch (err) {
    emailSent  = false;
    emailError = err instanceof Error ? err.message : "Email failed";
    console.error("Principal welcome email failed:", emailError);
  }

  return NextResponse.json({
    schoolId:     schoolRef.id,
    principalUid: uid,
    tempPassword,
    emailSent,
    emailError:   emailSent ? null : emailError,
    message:      emailSent
      ? `School created. Welcome email sent to ${principalEmail}`
      : `School created but email failed. Temp password: ${tempPassword}`,
  }, { status: 201 });
}
