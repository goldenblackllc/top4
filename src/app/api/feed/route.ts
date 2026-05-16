import { db } from '@/lib/firebase/admin';
import type { Top4Item, Category } from '@/lib/types';

const PAGE_SIZE = 20;

type RawEntry = {
  id: string;
  user_id: string;
  category: Category;
  items: Top4Item[];
  updated_at: string;
  like_count: number;
};

/**
 * Multi-bucket blended feed algorithm with infinite scroll.
 *
 * Strategy:
 *   🔥 Trending  — highest like_count (popular cards everyone loves)
 *   ✨ Fresh     — most recently updated (new faces get spotlight)
 *   📚 Catalog   — oldest entries (resurface hidden gems, give everyone a chance)
 *
 * Cards are interleaved in a weighted pattern: T F T C F C ...
 * (~35% trending, ~35% fresh, ~30% catalog)
 *
 * A diversity pass reorders (never drops) to avoid consecutive
 * same-user or same-category cards.
 *
 * Pagination: offset-based via `?page=1` (page 1 = first PAGE_SIZE cards).
 * The full blended order is computed per request to ensure consistency.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

    // Fetch ALL entries (Admin SDK, server-side — fast and free of client limits)
    const entriesSnap = await db.collection('top4_entries').get();

    // Parse and filter to entries with real content
    const allEntries: RawEntry[] = [];
    for (const doc of entriesSnap.docs) {
      const data = doc.data();
      const items = data.items as Top4Item[] | undefined;
      if (!items?.length || !items.some((i) => i.title)) continue;
      allEntries.push({
        id: doc.id,
        user_id: data.user_id,
        category: data.category,
        items,
        updated_at: data.updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        like_count: data.like_count || 0,
      });
    }

    // ── Build 3 Buckets ──────────────────────────────────────────
    // Each bucket is a full sorted copy; dedup happens during interleaving
    const trending = [...allEntries].sort((a, b) => b.like_count - a.like_count);
    const fresh = [...allEntries].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    const catalog = [...allEntries].sort((a, b) => a.updated_at.localeCompare(b.updated_at));

    // ── Interleave ───────────────────────────────────────────────
    // Pattern: Trending, Fresh, Trending, Catalog, Fresh, Catalog (repeats)
    // This gives roughly 35/35/30 weight distribution
    const pattern = ['trending', 'fresh', 'trending', 'catalog', 'fresh', 'catalog'] as const;
    const queues = {
      trending: [...trending],
      fresh: [...fresh],
      catalog: [...catalog],
    };

    const seen = new Set<string>();
    const interleaved: RawEntry[] = [];
    let pi = 0;

    // Keep going until we've placed every unique entry
    while (interleaved.length < allEntries.length) {
      const bucket = pattern[pi % pattern.length];
      pi++;

      // Try the intended bucket first, then fall back to others
      let entry: RawEntry | undefined;
      const tryBucket = (name: 'trending' | 'fresh' | 'catalog'): boolean => {
        while (queues[name].length > 0) {
          const candidate = queues[name].shift()!;
          if (!seen.has(candidate.id)) {
            entry = candidate;
            return true;
          }
        }
        return false;
      };

      if (!tryBucket(bucket)) {
        // Drain whichever bucket still has unseen entries
        for (const key of ['fresh', 'trending', 'catalog'] as const) {
          if (tryBucket(key)) break;
        }
      }

      if (!entry) break; // All entries placed
      seen.add(entry.id);
      interleaved.push(entry);
    }

    // ── Diversity Pass ───────────────────────────────────────────
    // Swap (never drop) to avoid consecutive same-user or same-category
    for (let i = 1; i < interleaved.length; i++) {
      const prev = interleaved[i - 1];
      const curr = interleaved[i];
      if (curr.user_id === prev.user_id || curr.category === prev.category) {
        // Find the nearest non-violating swap candidate (look up to 8 ahead)
        for (let j = i + 1; j < Math.min(i + 8, interleaved.length); j++) {
          if (
            interleaved[j].user_id !== prev.user_id &&
            interleaved[j].category !== prev.category
          ) {
            [interleaved[i], interleaved[j]] = [interleaved[j], interleaved[i]];
            break;
          }
        }
        // If no swap found, leave it — better to show a card than hide it
      }
    }

    // ── Paginate ─────────────────────────────────────────────────
    const start = (page - 1) * PAGE_SIZE;
    const pageEntries = interleaved.slice(start, start + PAGE_SIZE);
    const hasMore = start + PAGE_SIZE < interleaved.length;

    // ── Load Profiles ────────────────────────────────────────────
    const userIds = [...new Set(pageEntries.map((e) => e.user_id))];
    const profiles: Record<string, {
      id: string;
      display_name: string;
      avatar_url: string | null;
      created_at: string;
    }> = {};
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

    // ── Assemble Cards ───────────────────────────────────────────
    const cards = pageEntries
      .filter((e) => profiles[e.user_id])
      .map((e) => ({ profile: profiles[e.user_id], entry: e }));

    return Response.json({
      cards,
      page,
      hasMore,
      totalCards: interleaved.length,
    });
  } catch (err) {
    console.error('[api/feed] Error:', err);
    return Response.json(
      { cards: [], error: (err as Error).message, page: 1, hasMore: false, totalCards: 0 },
      { status: 500 },
    );
  }
}
