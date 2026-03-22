import admin from "firebase-admin";

function getAdminApp() {
  if (admin.apps.length > 0) return admin.apps[0]!;

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
    ? process.env.FIREBASE_ADMIN_PRIVATE_KEY
        .replace(/\\n/g, "\n")
        .replace(/^"|"$/g, "")
    : undefined;

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      privateKey,
    }),
  });
}

const adminApp = getAdminApp();
export const adminAuth = admin.auth(adminApp);
export const adminDb   = admin.firestore(adminApp);

export async function verifyIdToken(token: string) {
  return adminAuth.verifyIdToken(token);
}

export async function setUserClaims(uid: string, claims: { role: string; schoolId: string | null; permissions: string[] }) {
  await adminAuth.setCustomUserClaims(uid, claims);
}

export async function createAuthUser(email: string, displayName: string) {
  const chars    = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let tempPassword = "";
  for (let i = 0; i < 10; i++) tempPassword += chars[Math.floor(Math.random() * chars.length)];

  const user = await adminAuth.createUser({ email, displayName, password: tempPassword, emailVerified: false });
  return { uid: user.uid, tempPassword };
}
