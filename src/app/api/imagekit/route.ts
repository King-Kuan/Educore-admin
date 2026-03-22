import { NextResponse } from "next/server";
import { getSession } from "@/lib/api";
import { uploadStudentPhoto, uploadSchoolLogo, getImageKitAuthParams } from "@/lib/utils/imagekit";

export async function POST(request: Request) {
  const { claims, error } = await getSession();
  if (error) return error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { base64, type, schoolId, studentCode } = body;

  if (!base64 || !type) {
    return NextResponse.json({ error: "base64 and type required" }, { status: 400 });
  }

  if (!process.env.IMAGEKIT_PRIVATE_KEY || !process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY) {
    return NextResponse.json({ error: "ImageKit credentials not configured" }, { status: 500 });
  }

  try {
    const resolvedSchoolId = (schoolId as string) ?? claims!.schoolId ?? "unknown";
    let result: { url: string; fileId: string };

    if (type === "student") {
      if (!studentCode) {
        return NextResponse.json({ error: "studentCode required for student photos" }, { status: 400 });
      }
      result = await uploadStudentPhoto(base64 as string, studentCode as string, resolvedSchoolId);
    } else if (type === "logo") {
      result = await uploadSchoolLogo(base64 as string, resolvedSchoolId);
    } else {
      return NextResponse.json({ error: "type must be student or logo" }, { status: 400 });
    }

    if (!result?.url) {
      return NextResponse.json({ error: "Upload succeeded but no URL returned" }, { status: 500 });
    }

    return NextResponse.json({ url: result.url, fileId: result.fileId });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("ImageKit upload error:", msg);
    return NextResponse.json({ error: `Image upload failed: ${msg}` }, { status: 500 });
  }
}

export async function GET() {
  const { error } = await getSession();
  if (error) return error;

  try {
    const params = await getImageKitAuthParams();
    return NextResponse.json(params);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Auth params failed: ${msg}` }, { status: 500 });
  }
}
