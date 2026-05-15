import { db } from '@/lib/firebase/admin';
import type { Top4Item, Category } from '@/lib/types';

const CATEGORIES: Category[] = ['movies', 'tv', 'artists', 'books'];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get('category') as Category | null;

    // Fetch ALL entries in one read (no composite index needed)
    const snap = await db.collection('top4_entries').get();

    // Group by category, filter for entries with likes
    const byCat: Record<string, Array<{
      entryId: string;
      userId: string;
      items: Top4Item[];
      likeCount: number;
      updatedAt: string;
      category: Category;
    }>> = {};

    for (const cat of CATEGORIES) byCat[cat] = [];

    for (const doc of snap.docs) {
      const data = doc.data();
      const category = data.category as Category;
      if (!CATEGORIES.includes(category)) continue;

      const items = data.items as Top4Item[] | undefined;
      const likeCount = (data.like_count as number) || 0;
      if (!items?.length || !items[0]?.title || likeCount < 1) continue;

      byCat[category].push({
        entryId: doc.id,
        userId: data.user_id,
        items,
        likeCount,
        updatedAt: data.updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        category,
      });
    }

    // Sort each category by like_count desc, take top 5
    for (const cat of CATEGORIES) {
      byCat[cat].sort((a, b) => b.likeCount - a.likeCount);
      byCat[cat] = byCat[cat].slice(0, 5);
    }

    // If a specific category was requested, return full cards for that category
    if (categoryParam && CATEGORIES.includes(categoryParam)) {
      const entries = byCat[categoryParam];

      // Batch-load profiles
      const userIds = [...new Set(entries.map((e) => e.userId))];
      const profiles: Record<string, { id: string; display_name: string; avatar_url: string | null; created_at: string }> = {};
      await Promise.all(
        userIds.map(async (uid) => {
          const profileSnap = await db.collection('profiles').doc(uid).get();
          if (profileSnap.exists) {
            const d = profileSnap.data()!;
            profiles[uid] = {
              id: uid,
              display_name: d.display_name || 'Somebody',
              avatar_url: d.avatar_url || null,
              created_at: d.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
            };
          }
        })
      );

      const cards = entries
        .filter((e) => profiles[e.userId])
        .map((e) => ({
          profile: profiles[e.userId],
          entry: {
            id: e.entryId,
            user_id: e.userId,
            category: e.category,
            items: e.items,
            updated_at: e.updatedAt,
            like_count: e.likeCount,
          },
        }));

      return Response.json({ cards });
    }

    // Otherwise return the summary leaderboard (for the homepage teaser)
    const userIds = new Set<string>();
    for (const cat of CATEGORIES) {
      for (const e of byCat[cat]) userIds.add(e.userId);
    }

    const profiles: Record<string, { displayName: string; avatarUrl: string | null }> = {};
    await Promise.all(
      [...userIds].map(async (uid) => {
        const profileSnap = await db.collection('profiles').doc(uid).get();
        const d = profileSnap.exists ? profileSnap.data() : null;
        profiles[uid] = {
          displayName: d?.display_name || 'Somebody',
          avatarUrl: d?.avatar_url || null,
        };
      })
    );

    const leaderboard: Record<string, Array<{
      entryId: string;
      userId: string;
      displayName: string;
      avatarUrl: string | null;
      topPick: string;
      topPickImage: string | null;
      likeCount: number;
    }>> = {};

    for (const cat of CATEGORIES) {
      leaderboard[cat] = byCat[cat].map((e) => ({
        entryId: e.entryId,
        userId: e.userId,
        topPick: e.items[0].title,
        topPickImage: e.items[0].image_url || null,
        likeCount: e.likeCount,
        displayName: profiles[e.userId]?.displayName || 'Somebody',
        avatarUrl: profiles[e.userId]?.avatarUrl || null,
      }));
    }

    return Response.json({ leaderboard });
  } catch (err) {
    console.error('[api/leaderboard] Error:', err);
    return Response.json({ cards: [], leaderboard: {}, error: (err as Error).message }, { status: 500 });
  }
}
