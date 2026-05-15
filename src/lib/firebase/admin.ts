import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string || '{}'
);

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export const db = getFirestore();
export const adminAuth = getAuth();
export const adminStorage = getStorage();

/**
 * Create or get an existing Firebase Auth user by phone number,
 * then return a custom token for client-side sign-in.
 */
export async function createCustomToken(phoneNumber: string): Promise<{ uid: string; customToken: string }> {
  let uid: string;

  try {
    const existingUser = await adminAuth.getUserByPhoneNumber(phoneNumber);
    uid = existingUser.uid;
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error?.code === 'auth/user-not-found') {
      const newUser = await adminAuth.createUser({ phoneNumber });
      uid = newUser.uid;
    } else {
      throw err;
    }
  }

  const customToken = await adminAuth.createCustomToken(uid);
  return { uid, customToken };
}
