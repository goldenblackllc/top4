// TEMPORARY — remove after debugging auth/custom-token-mismatch
export async function GET() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  let parsed: Record<string, unknown> | null = null;
  let parseError: string | null = null;

  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch (e) {
    parseError = (e as Error).message;
  }

  return Response.json({
    FIREBASE_SERVICE_ACCOUNT_KEY_present: !!raw,
    FIREBASE_SERVICE_ACCOUNT_KEY_length: raw?.length ?? 0,
    FIREBASE_SERVICE_ACCOUNT_KEY_first50: raw?.substring(0, 50) ?? null,
    parsed_project_id: parsed?.project_id ?? 'MISSING',
    parsed_client_email: parsed?.client_email ?? 'MISSING',
    parsed_private_key_starts: typeof parsed?.private_key === 'string'
      ? (parsed.private_key as string).substring(0, 30)
      : 'MISSING',
    parse_error: parseError,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'NOT SET',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'NOT SET',
  });
}
