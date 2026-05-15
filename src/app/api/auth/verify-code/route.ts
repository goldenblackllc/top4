import twilio from 'twilio';
import { createCustomToken, db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID!;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Strip to only + and digits — invisible Unicode chars can cause "Invalid format"
    const phone = (body.phone || '').replace(/[^\d+]/g, '');
    const code = body.code || '';

    if (!phone || !code) {
      return Response.json({ error: 'Phone and code are required.' }, { status: 400 });
    }

    // 1. Verify the code with Twilio
    const check = await client.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code });

    if (check.status !== 'approved') {
      return Response.json({ error: 'Invalid code. Please try again.' }, { status: 401 });
    }

    // 2. Find or create Firebase user, mint custom token
    const { uid, customToken } = await createCustomToken(phone);

    // 3. Ensure a Top4 profile exists (server-side, bypasses Firestore rules)
    const profileRef = db.collection('profiles').doc(uid);
    const profileSnap = await profileRef.get();
    if (!profileSnap.exists) {
      await profileRef.set({
        display_name: 'Somebody',
        avatar_url: null,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });
    }

    return Response.json({ success: true, token: customToken });
  } catch (error: unknown) {
    console.error('Verify Code Error:', error);
    const twilioError = error as { code?: number };

    if (twilioError.code === 60202) {
      return Response.json({ error: 'Too many attempts. Please request a new code.' }, { status: 429 });
    }

    return Response.json({ error: 'Verification failed. Please try again.' }, { status: 500 });
  }
}
