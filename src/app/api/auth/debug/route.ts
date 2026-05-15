// TEMPORARY — remove after debugging auth/custom-token-mismatch
import { adminAuth } from '@/lib/firebase/admin';

export async function GET() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  let parsed: Record<string, unknown> | null = null;
  let parseError: string | null = null;

  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch (e) {
    parseError = (e as Error).message;
  }

  // Try minting a test custom token and decoding the JWT
  let tokenClaims: Record<string, unknown> | null = null;
  let tokenError: string | null = null;
  try {
    const testToken = await adminAuth.createCustomToken('debug-test-uid');
    // Decode JWT payload (no verification, just read claims)
    const parts = testToken.split('.');
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    tokenClaims = { header, payload, tokenLength: testToken.length };
  } catch (e) {
    tokenError = (e as Error).message;
  }

  return Response.json({
    env: {
      FIREBASE_SERVICE_ACCOUNT_KEY_present: !!raw,
      FIREBASE_SERVICE_ACCOUNT_KEY_length: raw?.length ?? 0,
      parsed_project_id: parsed?.project_id ?? 'MISSING',
      parsed_client_email: parsed?.client_email ?? 'MISSING',
      parsed_private_key_id: parsed?.private_key_id ?? 'MISSING',
      parse_error: parseError,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'NOT SET',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'NOT SET',
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'NOT SET',
    },
    customToken: {
      claims: tokenClaims,
      error: tokenError,
    },
  });
}
