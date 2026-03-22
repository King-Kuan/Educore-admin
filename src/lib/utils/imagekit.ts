import ImageKit from "imagekit";

function getIK() {
  return new ImageKit({
    publicKey:   process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
    privateKey:  process.env.IMAGEKIT_PRIVATE_KEY!,
    urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
  });
}

export async function getImageKitAuthParams() {
  const ik = getIK();
  return ik.getAuthenticationParameters();
}

export async function uploadStudentPhoto(
  base64: string,
  studentCode: string,
  schoolId: string
): Promise<{ url: string; fileId: string }> {
  const ik = getIK();
  const result = await ik.upload({
    file:     base64,
    fileName: `student_${studentCode}.jpg`,
    folder:   `/educore/schools/${schoolId}/students`,
    useUniqueFileName: true,
  });
  return { url: result.url, fileId: result.fileId };
}

export async function uploadSchoolLogo(
  base64: string,
  schoolId: string
): Promise<{ url: string; fileId: string }> {
  const ik = getIK();
  const result = await ik.upload({
    file:     base64,
    fileName: `logo_${schoolId}.png`,
    folder:   `/educore/schools/${schoolId}`,
    useUniqueFileName: false,
  });
  return { url: result.url, fileId: result.fileId };
}
