import { NextResponse } from "next/server";
import { getSession } from "@/lib/api";
import { adminDb } from "@/lib/firebase/admin";
import { uploadToR2, generateFileKey, calculateFileExpiry } from "@/lib/utils/r2";
import { Timestamp } from "firebase-admin/firestore";
import { getCurrentAcademicYear, getCurrentTerm } from "@/lib/utils/helpers";

export const config = { api: { bodyParser: false } };

export async function POST(request: Request) {
  const { claims, error } = await getSession();
  if (error) return error;

  try {
    const formData    = await request.formData();
    const file        = formData.get("file") as File | null;
    const title       = formData.get("title") as string;
    const type        = formData.get("type") as string;
    const classId     = formData.get("classId") as string;
    const schoolId    = (formData.get("schoolId") as string) ?? claims!.schoolId;
    const subjectId   = (formData.get("subjectId") as string) ?? null;

    if (!file)        return NextResponse.json({ error: "No file provided" },     { status: 400 });
    if (!title)       return NextResponse.json({ error: "Title required" },        { status: 400 });
    if (!schoolId)    return NextResponse.json({ error: "schoolId required" },     { status: 400 });
    if (!classId)     return NextResponse.json({ error: "classId required" },      { status: 400 });

    // Validate file size (10 MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 10 MB." }, { status: 400 });
    }

    // Validate mime type
    const allowed = ["application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Only PDF and Office files allowed" }, { status: 400 });
    }

    const term        = getCurrentTerm();
    const year        = getCurrentAcademicYear();

    // Generate R2 key
    const r2Key = generateFileKey(schoolId, year, term, classId, file.name);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);

    // Upload to R2
    await uploadToR2(r2Key, buffer, file.type, {
      schoolId,
      classId,
      uploadedBy: claims!.uid,
      title,
    });

    // Calculate expiry (4 months from now)
    const uploadedAt = new Date();
    const expiresAt  = calculateFileExpiry(uploadedAt);

    // Save metadata to Firestore
    const docRef = await adminDb
      .collection("schools").doc(schoolId)
      .collection("files")
      .add({
        schoolId,
        folderId:   classId, // using classId as folderId for simplicity
        classId,
        subjectId,
        uploadedBy: claims!.uid,
        title,
        description: null,
        type,
        r2Key,
        fileUrl:    null, // generated on demand
        fileSize:   file.size,
        mimeType:   file.type,
        term,
        academicYear: year,
        uploadedAt: Timestamp.fromDate(uploadedAt),
        expiresAt:  Timestamp.fromDate(expiresAt),
        isDeleted:  false,
      });

    return NextResponse.json({
      id:       docRef.id,
      title,
      r2Key,
      fileSize: file.size,
      expiresAt: expiresAt.toISOString(),
    }, { status: 201 });

  } catch (err) {
    console.error("File upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
