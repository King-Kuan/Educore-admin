import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole, getSession } from "@/lib/api";
import { Timestamp } from "firebase-admin/firestore";

// GET /api/ads — all ads (superadmin) or active ads by audience (others)
export async function GET(request: Request) {
  const { claims, error } = await getSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const audience = searchParams.get("audience"); // principal | teacher | parent

  let query = adminDb.collection("ads") as FirebaseFirestore.Query;

  if (claims!.role !== "superadmin") {
    query = query.where("isActive", "==", true);
    if (audience) {
      query = query.where("targetAudience", "array-contains", audience);
    }
  }

  const snap = await query.orderBy("createdAt", "desc").get();
  const ads  = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ ads, total: ads.length });
}

// POST /api/ads — superadmin creates an ad
export async function POST(request: Request) {
  const { claims, error } = await requireRole("superadmin");
  if (error) return error;

  const body = await request.json();
  const { title, description, imageUrl, linkUrl, targetAudience, startDate, endDate } = body;

  if (!title || !targetAudience?.length) {
    return NextResponse.json({ error: "title and targetAudience required" }, { status: 400 });
  }

  const now = Timestamp.now();
  const ref = await adminDb.collection("ads").add({
    title,
    description:    description ?? "",
    imageUrl:       imageUrl    ?? "",
    linkUrl:        linkUrl     ?? null,
    targetAudience,
    startDate:      startDate ? Timestamp.fromDate(new Date(startDate)) : now,
    endDate:        endDate   ? Timestamp.fromDate(new Date(endDate))   : now,
    isActive:       true,
    impressions:    0,
    clicks:         0,
    createdBy:      claims!.uid,
    createdAt:      now,
  });

  return NextResponse.json({ id: ref.id }, { status: 201 });
}
