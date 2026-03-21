import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getR2Client() {
  return new S3Client({
    region:   "auto",
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

const BUCKET = () => process.env.R2_BUCKET_NAME!;

export async function uploadToR2(key: string, body: Buffer | Uint8Array, mimeType: string) {
  const client = getR2Client();
  await client.send(new PutObjectCommand({ Bucket: BUCKET(), Key: key, Body: body, ContentType: mimeType }));
  return { key, url: `${process.env.R2_PUBLIC_URL}/${key}` };
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600) {
  const client  = getR2Client();
  const command = new GetObjectCommand({ Bucket: BUCKET(), Key: key });
  return getSignedUrl(client, command, { expiresIn });
}

export async function deleteFromR2(key: string) {
  const client = getR2Client();
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }));
}

export function generateFileKey(schoolId: string, academicYear: string, term: number, folderId: string, fileName: string) {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `schools/${schoolId}/files/${academicYear}/term${term}/${folderId}/${Date.now()}_${sanitized}`;
}

export function calculateFileExpiry(uploadedAt: Date): Date {
  const expiry = new Date(uploadedAt);
  expiry.setMonth(expiry.getMonth() + 4);
  return expiry;
}
