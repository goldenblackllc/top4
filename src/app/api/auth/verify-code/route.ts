import twilio from 'twilio';
import { createCustomToken, db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/** Extract primary language code from Accept-Language header (e.g. 'es-MX,es;q=0.9' → 'es') */
function parseLocale(header: string | null): string {
  if (!header) return 'en';
  const primary = header.split(',')[0]?.split(';')[0]?.trim().toLowerCase();
  if (!primary) return 'en';
  // Extract the language portion (before any region subtag)
  const lang = primary.split('-')[0];
  // Only accept known 2-letter language codes we support
  const supported = ['en', 'es'];
  return supported.includes(lang) ? lang : 'en';
}

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
    const locale = parseLocale(req.headers.get('accept-language'));
    const profileRef = db.collection('profiles').doc(uid);
    const profileSnap = await profileRef.get();
    if (!profileSnap.exists) {
      await profileRef.set({
        display_name: 'Somebody',
        avatar_url: null,
        locale,
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
