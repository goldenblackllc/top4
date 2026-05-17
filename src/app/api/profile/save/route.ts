import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Category, Top4Item } from '@/lib/types';

/**
 * POST /api/profile/save — Save profile data and/or entries via the Admin SDK.
 *
 * Accepts:
 *   { userId, displayName?, avatarUrl?, entries?: { category, items }[], locale? }
 *
 * Uses the Admin SDK so writes bypass Firestore security rules — no more
 * client-side auth-token failures on mobile.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, displayName, avatarUrl, entries, locale } = body as {
      userId: string;
      displayName?: string;
      avatarUrl?: string | null;
      entries?: { category: Category; items: Top4Item[] }[];
      locale?: string;
    };

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    const results: string[] = [];

    // --- Save profile (if name or avatar provided) ---
    if (displayName !== undefined || avatarUrl !== undefined) {
      const profilePayload: Record<string, unknown> = {
        updated_at: FieldValue.serverTimestamp(),
      };
      if (displayName !== undefined) profilePayload.display_name = displayName;
      if (avatarUrl !== undefined) profilePayload.avatar_url = avatarUrl;
      if (locale) profilePayload.locale = locale;

      await db.collection('profiles').doc(userId).set(profilePayload, { merge: true });
      results.push('profile');
    }

    // --- Save entries ---
    if (entries && entries.length > 0) {
      const batch = db.batch();

      for (const entry of entries) {
        const docId = `${userId}_${entry.category}`;
        const ref = db.collection('top4_entries').doc(docId);
        batch.set(
          ref,
          {
            user_id: userId,
            category: entry.category,
            items: entry.items,
            updated_at: FieldValue.serverTimestamp(),
            ...(locale ? { locale } : {}),
          },
          { merge: true },
        );
      }

      await batch.commit();
      results.push(`entries(${entries.length})`);
    }

    return Response.json({ success: true, saved: results });
  } catch (err) {
    console.error('[api/profile/save] Error:', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
