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
