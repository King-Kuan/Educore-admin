import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getSession } from "@/lib/api";
import { getSignedDownloadUrl } from "@/lib/utils/r2";

// GET /api/files?schoolId=&folderId=
export async function GET(request: Request) {
  const { claims, error } = await getSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get("schoolId") ?? claims!.schoolId;
  const folderId = searchParams.get("folderId");
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  let query = adminDb
    .collection("schools").doc(schoolId)
    .collection("files")
    .where("isDeleted", "==", false) as FirebaseFirestore.Query;

  if (folderId) query = query.where("folderId", "==", folderId);

  const snap  = await query.orderBy("uploadedAt", "desc").get();

  // Generate signed URLs for each file
  const files = await Promise.all(
    snap.docs.map(async (d) => {
      const data = d.data();
      let fileUrl = data["fileUrl"] ?? null;
      // Regenerate signed URL if r2Key exists
      if (data["r2Key"] && !fileUrl) {
        try {
          fileUrl = await getSignedDownloadUrl(data["r2Key"]);
        } catch {
          fileUrl = null;
        }
      }
      return { id: d.id, ...data, fileUrl };
    })
  );

  return NextResponse.json({ files, total: files.length });
}
