import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updatePassword,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./client";
import type { AppUser, UserRole } from "@/lib/types";

export async function signIn(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, "users", cred.user.uid), { lastLoginAt: serverTimestamp() }, { merge: true });
  return cred.user;
}

export async function signOut() {
  await fbSignOut(auth);
}

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data() as AppUser;
}

export async function getUserClaims(user: User) {
  const token  = await user.getIdTokenResult();
  const claims = token.claims;
  if (!claims["role"]) return null;
  return {
    role:        claims["role"] as UserRole,
    schoolId:    (claims["schoolId"] as string) ?? null,
    permissions: (claims["permissions"] as string[]) ?? [],
  };
}

export async function changePassword(newPassword: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");
  await updatePassword(user, newPassword);
}

export async function getIdToken(): Promise<string | null> {
  return auth.currentUser?.getIdToken() ?? null;
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
