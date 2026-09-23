import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID!;
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

// ── Rate Limiting ──────────────────────────────────────────────────
// Defense-in-depth: even if Turnstile passes, limit how many OTPs
// can be sent per IP and globally. In-memory store resets on cold
// starts, but catches sustained attacks within a function instance.

const ipBuckets = new Map<string, number[]>();
const globalBucket: number[] = [];

const IP_LIMIT = 3;         // max 3 sends per IP per window
const GLOBAL_LIMIT = 30;    // max 30 sends globally per window
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isRateLimited(ip: string): { limited: boolean; reason?: string } {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  // Clean and check IP bucket
  const ipTimestamps = (ipBuckets.get(ip) || []).filter(t => t > cutoff);
  if (ipTimestamps.length >= IP_LIMIT) {
    return { limited: true, reason: `IP ${ip} exceeded ${IP_LIMIT} requests` };
  }

  // Clean and check global bucket
  while (globalBucket.length > 0 && globalBucket[0] <= cutoff) {
    globalBucket.shift();
  }
  if (globalBucket.length >= GLOBAL_LIMIT) {
    return { limited: true, reason: 'Global rate limit exceeded' };
  }

  // Record this request
  ipTimestamps.push(now);
  ipBuckets.set(ip, ipTimestamps);
  globalBucket.push(now);

  return { limited: false };
}

// ── Turnstile Verification ─────────────────────────────────────────

async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
    if (!TURNSTILE_SECRET_KEY) {
        console.warn('[send-code] TURNSTILE_SECRET_KEY not set — skipping Turnstile verification');
        return true;
    }

    try {
        const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                secret: TURNSTILE_SECRET_KEY,
                response: token,
                remoteip: ip,
            }),
        });
        const data = await res.json();
        return data.success === true;
    } catch (err) {
        console.error('[send-code] Turnstile verification error:', err);
        return false;
    }
}

// ── Route Handler ──────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    // Layer 1: Rate limiting (before parsing body, before Turnstile)
    const rateCheck = isRateLimited(ip);
    if (rateCheck.limited) {
        console.warn(`[send-code] Rate limited: ${rateCheck.reason}`);
        return Response.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429, headers: { 'Retry-After': '900' } }
        );
    }

    const { phone, turnstileToken } = await req.json();

    // Layer 2: Turnstile verification
    if (TURNSTILE_SECRET_KEY) {
        if (!turnstileToken) {
            return Response.json({ error: 'Security verification required.' }, { status: 403 });
        }
        const isHuman = await verifyTurnstileToken(turnstileToken, ip);
        if (!isHuman) {
            console.warn('[send-code] Turnstile verification failed for IP:', ip);
            return Response.json({ error: 'Security verification failed. Please refresh and try again.' }, { status: 403 });
        }
    }

    if (!phone) {
      return Response.json({ error: 'Phone number is required.' }, { status: 400 });
    }

    // Format to E.164: strip non-digits, prepend +1 for US numbers
    let formatted = phone.replace(/\D/g, '');
    if (formatted.length === 10) {
      formatted = '1' + formatted;
    }
    formatted = '+' + formatted;

    await client.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verifications.create({ to: formatted, channel: 'sms' });

    return Response.json({ success: true, phone: formatted });
  } catch (error: unknown) {
    console.error('Send Code Error:', error);
    const twilioError = error as { code?: number };

    if (twilioError.code === 60203) {
      return Response.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }
    if (twilioError.code === 60200) {
      return Response.json({ error: 'Invalid phone number.' }, { status: 400 });
    }

    return Response.json({ error: 'Failed to send verification code.' }, { status: 500 });
  }
}

