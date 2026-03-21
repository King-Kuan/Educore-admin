import { NextResponse } from "next/server";
import { getSession } from "@/lib/api";
import { uploadStudentPhoto, uploadSchoolLogo, getImageKitAuthParams } from "@/lib/utils/imagekit";

// POST /api/imagekit/upload
// Body: { base64, type: "student"|"logo", schoolId, studentCode? }
export async function POST(request: Request) {
  const { claims, error } = await getSession();
  if (error) return error;

  const body = await request.json();
  const { base64, type, schoolId, studentCode } = body;

  if (!base64 || !type) {
    return NextResponse.json({ error: "base64 and type required" }, { status: 400 });
  }

  try {
    let result: { url: string; fileId: string };

    if (type === "student") {
      if (!studentCode) return NextResponse.json({ error: "studentCode required for student photos" }, { status: 400 });
      result = await uploadStudentPhoto(base64, studentCode, schoolId ?? claims!.schoolId ?? "unknown");
    } else if (type === "logo") {
      result = await uploadSchoolLogo(base64, schoolId ?? claims!.schoolId ?? "unknown");
    } else {
      return NextResponse.json({ error: "type must be student or logo" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("ImageKit upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

// GET /api/imagekit/upload — return auth params for client-side upload
export async function GET() {
  const { error } = await getSession();
  if (error) return error;

  const params = await getImageKitAuthParams();
  return NextResponse.json(params);
}
