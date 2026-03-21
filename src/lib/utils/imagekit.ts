import ImageKit from "imagekit";

function getIK() {
  return new ImageKit({
    publicKey:   process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
    privateKey:  process.env.IMAGEKIT_PRIVATE_KEY!,
    urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
  });
}

export async function getImageKitAuthParams() {
  return getIK().getAuthenticationParameters();
}

export async function uploadStudentPhoto(base64: string, studentCode: string, schoolId: string) {
  const result = await getIK().upload({
    file: base64, fileName: `student_${studentCode}.jpg`,
    folder: `/educore/schools/${schoolId}/students`,
  });
  return { url: result.url, fileId: result.fileId };
}

export async function uploadSchoolLogo(base64: string, schoolId: string) {
  const result = await getIK().upload({
    file: base64, fileName: `logo_${schoolId}.png`,
    folder: `/educore/schools/${schoolId}`,
  });
  return { url: result.url, fileId: result.fileId };
}
