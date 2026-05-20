import { db } from '@/lib/firebase/admin';
import type { Top4Item, Category } from '@/lib/types';

const CATEGORIES: Category[] = ['movies', 'tv', 'artists', 'books'];

/**
 * Leaderboard API — now uses targeted per-category queries
 * instead of a full-collection scan.
 *
 * Uses denormalized profile data from entry docs when available,
 * falling back to the profiles collection for unmigrated entries.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get('category') as Category | null;
    const locale = searchParams.get('locale') || 'en';

    // Determine which categories to query
    const categoriesToFetch = categoryParam && CATEGORIES.includes(categoryParam)
      ? [categoryParam]
      : CATEGORIES;

    // Fire targeted queries in parallel — one per category
    const categoryResults = await Promise.all(
      categoriesToFetch.map(async (cat) => {
        const snap = await db
          .collection('top4_entries')
          .where('category', '==', cat)
          .where('locale', '==', locale)
          .orderBy('like_count', 'desc')
          .limit(5)
          .get();

        const entries: Array<{
          entryId: string;
          userId: string;
          items: Top4Item[];
          likeCount: number;
          updatedAt: string;
          category: Category;
          ownerDisplayName: string;
          ownerAvatarUrl: string | null;
        }> = [];

        for (const doc of snap.docs) {
          const data = doc.data();
          const items = data.items as Top4Item[] | undefined;
          const likeCount = (data.like_count as number) || 0;
          if (!items?.length || !items[0]?.title || likeCount < 1) continue;

          entries.push({
            entryId: doc.id,
            userId: data.user_id,
            items,
            likeCount,
            updatedAt: data.updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
            category: cat,
            ownerDisplayName: data.owner_display_name || '',
            ownerAvatarUrl: data.owner_avatar_url ?? null,
          });
        }

        return { category: cat, entries };
      }),
    );

    // Collect users that need profile fetches (unmigrated entries)
    const needsProfile = new Set<string>();
    for (const { entries } of categoryResults) {
      for (const e of entries) {
        if (!e.ownerDisplayName) needsProfile.add(e.userId);
      }
    }

    const fetchedProfiles: Record<string, { displayName: string; avatarUrl: string | null }> = {};
    if (needsProfile.size > 0) {
      await Promise.all(
        [...needsProfile].map(async (uid) => {
          const snap = await db.collection('profiles').doc(uid).get();
          const d = snap.exists ? snap.data() : null;
          fetchedProfiles[uid] = {
            displayName: d?.display_name || 'Somebody',
            avatarUrl: d?.avatar_url || null,
          };
        }),
      );
    }

    // Helper to resolve display name
    const getName = (e: { userId: string; ownerDisplayName: string }) =>
      e.ownerDisplayName || fetchedProfiles[e.userId]?.displayName || 'Somebody';
    const getAvatar = (e: { userId: string; ownerAvatarUrl: string | null }) =>
      e.ownerAvatarUrl ?? fetchedProfiles[e.userId]?.avatarUrl ?? null;

    // If a specific category was requested, return full cards
    if (categoryParam && CATEGORIES.includes(categoryParam)) {
      const result = categoryResults[0];
      const cards = result.entries.map((e) => ({
        profile: {
          id: e.userId,
          display_name: getName(e),
          avatar_url: getAvatar(e),
          created_at: '',
        },
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

    // Summary leaderboard (all categories)
    const leaderboard: Record<string, Array<{
      entryId: string;
      userId: string;
      displayName: string;
      avatarUrl: string | null;
      topPick: string;
      topPickImage: string | null;
      likeCount: number;
    }>> = {};

    for (const { category, entries } of categoryResults) {
      leaderboard[category] = entries.map((e) => ({
        entryId: e.entryId,
        userId: e.userId,
        topPick: e.items[0].title,
        topPickImage: e.items[0].image_url || null,
        likeCount: e.likeCount,
        displayName: getName(e),
        avatarUrl: getAvatar(e),
      }));
    }

    return Response.json({ leaderboard });
  } catch (err) {
    console.error('[api/leaderboard] Error:', err);
    return Response.json(
      { cards: [], leaderboard: {}, error: (err as Error).message },
      { status: 500 },
    );
  }
}
