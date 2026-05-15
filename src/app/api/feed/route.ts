import { db } from '@/lib/firebase/admin';
import type { Top4Item, Category } from '@/lib/types';

export async function GET() {
  try {
    const entriesSnap = await db.collection('top4_entries').get();

    // Filter to entries that have real items
    type RawEntry = {
      id: string;
      user_id: string;
      category: Category;
      items: Top4Item[];
      updated_at: string;
      like_count: number;
    };

    const entries: RawEntry[] = [];
    for (const doc of entriesSnap.docs) {
      const data = doc.data();
      const items = data.items as Top4Item[] | undefined;
      if (!items?.length || !items.some((i) => i.title)) continue;
      entries.push({
        id: doc.id,
        user_id: data.user_id,
        category: data.category,
        items,
        updated_at: data.updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        like_count: data.like_count || 0,
      });
    }

    // Batch-load profiles
    const userIds = [...new Set(entries.map((e) => e.user_id))];
    const profiles: Record<string, { id: string; display_name: string; avatar_url: string | null; created_at: string }> = {};
    await Promise.all(
      userIds.map(async (uid) => {
        const snap = await db.collection('profiles').doc(uid).get();
        if (snap.exists) {
          const d = snap.data()!;
          profiles[uid] = {
            id: uid,
            display_name: d.display_name || '',
            avatar_url: d.avatar_url || null,
            created_at: d.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
          };
        }
      })
    );

    // Assemble cards
    const cards = entries
      .filter((e) => profiles[e.user_id])
      .map((e) => ({ profile: profiles[e.user_id], entry: e }));

    return Response.json({ cards });
  } catch (err) {
    console.error('[api/feed] Error:', err);
    return Response.json({ cards: [], error: (err as Error).message }, { status: 500 });
  }
}
