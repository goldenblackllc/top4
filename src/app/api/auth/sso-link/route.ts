import { adminAuth } from '@/lib/firebase/admin';
import { generateSSOToken } from '@/lib/sso';

const EARNEST_PAGE_URL = process.env.SSO_EARNEST_PAGE_URL || 'https://earnest-page.vercel.app';

/**
 * POST /api/auth/sso-link
 * 
 * Generates a signed SSO redirect URL for the authenticated user.
 * The client sends their Firebase ID token; we look up their phone number
 * from Firebase Auth and create a signed token for the destination app.
 */
export async function POST(req: Request) {
  try {
    // 1. Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(idToken);

    // 2. Get the user's phone number from Firebase Auth
    const userRecord = await adminAuth.getUser(decoded.uid);
    const phone = userRecord.phoneNumber;

    if (!phone) {
      return Response.json(
        { error: 'No phone number associated with this account' },
        { status: 400 }
      );
    }

    // 3. Generate the signed SSO token
    const token = generateSSOToken(phone, 'top4');

    // 4. Build the redirect URL
    const ssoUrl = `${EARNEST_PAGE_URL}/api/auth/sso?token=${encodeURIComponent(token)}`;

    return Response.json({ url: ssoUrl });
  } catch (error) {
    console.error('[sso-link] Error:', error);
    return Response.json({ error: 'Failed to generate SSO link' }, { status: 500 });
  }
}
