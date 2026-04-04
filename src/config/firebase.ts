import admin from "firebase-admin";
import { env } from "./env";

let initialized = false;

export function initFirebase(): boolean {
  if (initialized) return true;
  if (!env.firebaseDatabaseUrl || !env.firebaseProjectId || !env.firebaseClientEmail || !env.firebasePrivateKey) {
    return false;
  }
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.firebaseProjectId,
      clientEmail: env.firebaseClientEmail,
      privateKey: env.firebasePrivateKey,
    }),
    databaseURL: env.firebaseDatabaseUrl,
  });
  initialized = true;
  return true;
}

export function getFirebaseDb() {
  return admin.database();
}
