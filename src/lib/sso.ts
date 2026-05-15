import crypto from 'crypto';

const SSO_TOKEN_EXPIRY_SECONDS = 60;

interface SSOPayload {
  phone: string;
  source: string;
  exp: number;
  nonce: string;
}

/**
 * Generate a signed SSO token for cross-app authentication.
 * The token contains the user's phone number, source app identifier,
 * expiry timestamp, and a random nonce to prevent replay attacks.
 */
export function generateSSOToken(phone: string, source: string = 'top4'): string {
  const secret = process.env.SSO_SHARED_SECRET;
  if (!secret) {
    throw new Error('SSO_SHARED_SECRET is not configured');
  }

  const payload: SSOPayload = {
    phone,
    source,
    exp: Math.floor(Date.now() / 1000) + SSO_TOKEN_EXPIRY_SECONDS,
    nonce: crypto.randomBytes(16).toString('hex'),
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadBase64)
    .digest('base64url');

  return `${payloadBase64}.${signature}`;
}
