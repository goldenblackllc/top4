import { db } from '@/lib/firebase/admin';
import type { Category, Top4Item } from '@/lib/types';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return Response.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    // Load profile
    const profileSnap = await db.collection('profiles').doc(userId).get();
    const profile = profileSnap.exists
      ? {
          id: userId,
          display_name: profileSnap.data()!.display_name || '',
          avatar_url: profileSnap.data()!.avatar_url || null,
          locale: profileSnap.data()!.locale || 'en',
          created_at: profileSnap.data()!.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        }
      : null;

    // Load entries
    const categories: Category[] = ['movies', 'tv', 'artists', 'books'];
    const entries = [];
    for (const cat of categories) {
      const snap = await db.collection('top4_entries').doc(`${userId}_${cat}`).get();
      if (snap.exists) {
        const data = snap.data()!;
        entries.push({
          id: snap.id,
          user_id: userId,
          category: cat,
          items: (data.items as Top4Item[]) || [],
          updated_at: data.updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
          like_count: data.like_count || 0,
        });
      }
    }

    return Response.json({ profile, entries });
  } catch (err) {
    console.error('[api/profile] Error:', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}

/**
 * PATCH /api/profile — Update the user's locale.
 * When locale changes, backfill all their top4_entries so Firestore queries work.
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { userId, locale } = body;

    if (!userId || !locale) {
      return Response.json({ error: 'userId and locale are required' }, { status: 400 });
    }

    // Validate locale is a supported value
    const supported = ['en', 'es'];
    if (!supported.includes(locale)) {
      return Response.json({ error: `Unsupported locale: ${locale}` }, { status: 400 });
    }

    // Update profile locale
    const profileRef = db.collection('profiles').doc(userId);
    await profileRef.update({ locale });

    // Backfill all entries with the new locale
    const categories: Category[] = ['movies', 'tv', 'artists', 'books'];
    const batch = db.batch();
    for (const cat of categories) {
      const entryRef = db.collection('top4_entries').doc(`${userId}_${cat}`);
      const snap = await entryRef.get();
      if (snap.exists) {
        batch.update(entryRef, { locale });
      }
    }
    await batch.commit();

    return Response.json({ success: true });
  } catch (err) {
    console.error('[api/profile PATCH] Error:', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
