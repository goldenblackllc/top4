import { db } from '@/lib/firebase/admin';
import type { Top4Item, Category } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;
const TRENDING_POOL = 100; // Fetch top 100, re-rank by hotScore
const BUCKET_SIZE = 40;    // Per-bucket fetch size for fresh/catalog

type RawEntry = {
  id: string;
  user_id: string;
  category: Category;
  items: Top4Item[];
  updated_at: string;
  like_count: number;
  owner_display_name: string;
  owner_avatar_url: string | null;
};

/**
 * Hacker-News-style hot score: recent posts with engagement
 * beat old posts with many likes. Gravity 1.8 ≈ 50% decay/day.
 */
function hotScore(likeCount: number, updatedAt: Date): number {
  const ageHours = (Date.now() - updatedAt.getTime()) / 3_600_000;
  return likeCount / Math.pow(Math.max(ageHours, 0) + 2, 1.8);
}

/** Parse a Firestore doc into a RawEntry, or null if empty. */
function parseDoc(doc: FirebaseFirestore.QueryDocumentSnapshot): RawEntry | null {
  const data = doc.data();
  const items = data.items as Top4Item[] | undefined;
  if (!items?.length || !items.some((i) => i.title)) return null;
  return {
    id: doc.id,
    user_id: data.user_id,
    category: data.category,
    items,
    updated_at: data.updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
    like_count: (data.like_count as number) || 0,
    owner_display_name: data.owner_display_name || '',
    owner_avatar_url: data.owner_avatar_url ?? null,
  };
}

/**
 * Multi-bucket blended feed with targeted Firestore queries.
 *
 *   🔥 Trending  — top 100 by like_count, re-ranked by hotScore (time-decay)
 *   ✨ Fresh     — most recently updated
 *   📚 Catalog   — random timestamp pivot (surfaces hidden gems)
 *
 * Cards are interleaved ~35/35/30, with a diversity pass to avoid
 * consecutive same-user or same-category cards.
 *
 * Profile data is read from denormalized fields on the entry doc —
 * no extra profile reads needed.
 *
 * Pagination: offset-based via `?page=1`.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const locale = searchParams.get('locale') || 'en';

    const entriesCol = db.collection('top4_entries');

    // ── Random pivot for Catalog bucket ───────────────────────
    // Pick a random point in the last 6 months to sample from
    const randomPivot = new Date(
      Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000,
    );

    // ── Fire all 3 targeted queries in parallel ──────────────
    const [trendingSnap, freshSnap, catalogSnap] = await Promise.all([
      // 🔥 Top 100 by like_count → re-ranked by hotScore in memory
      entriesCol
        .where('locale', '==', locale)
        .orderBy('like_count', 'desc')
        .limit(TRENDING_POOL)
        .get(),

      // ✨ Most recently updated
      entriesCol
        .where('locale', '==', locale)
        .orderBy('updated_at', 'desc')
        .limit(BUCKET_SIZE)
        .get(),

      // 📚 Random window — entries updated after a random pivot
      entriesCol
        .where('locale', '==', locale)
        .where('updated_at', '>=', randomPivot)
        .orderBy('updated_at', 'asc')
        .limit(BUCKET_SIZE)
        .get(),
    ]);

    // ── Parse results ────────────────────────────────────────
    const trendingRaw = trendingSnap.docs.map(parseDoc).filter(Boolean) as RawEntry[];
    const freshRaw = freshSnap.docs.map(parseDoc).filter(Boolean) as RawEntry[];
    let catalogRaw = catalogSnap.docs.map(parseDoc).filter(Boolean) as RawEntry[];

    // Catalog wrap-around: if the random pivot was too recent, fetch from the start
    if (catalogRaw.length < BUCKET_SIZE) {
      const wrapSnap = await entriesCol
        .where('locale', '==', locale)
        .orderBy('updated_at', 'asc')
        .limit(BUCKET_SIZE - catalogRaw.length)
        .get();
      const wrapParsed = wrapSnap.docs.map(parseDoc).filter(Boolean) as RawEntry[];
      const catalogIds = new Set(catalogRaw.map((e) => e.id));
      catalogRaw = [...catalogRaw, ...wrapParsed.filter((e) => !catalogIds.has(e.id))];
    }

    // ── Phase 3: Time-decay re-ranking for Trending ──────────
    const trending = trendingRaw
      .map((e) => ({ ...e, _score: hotScore(e.like_count, new Date(e.updated_at)) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, BUCKET_SIZE);

    // ── Interleave: T F T C F C ... (~35/35/30) ─────────────
    const pattern = ['trending', 'fresh', 'trending', 'catalog', 'fresh', 'catalog'] as const;
    const queues = {
      trending: [...trending],
      fresh: [...freshRaw],
      catalog: [...catalogRaw],
    };

    const seen = new Set<string>();
    const interleaved: RawEntry[] = [];
    const maxCards = trendingRaw.length + freshRaw.length + catalogRaw.length;
    let pi = 0;

    while (interleaved.length < maxCards) {
      const bucket = pattern[pi % pattern.length];
      pi++;

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
        for (const key of ['fresh', 'trending', 'catalog'] as const) {
          if (tryBucket(key)) break;
        }
      }

      if (!entry) break;
      seen.add(entry.id);
      interleaved.push(entry);
    }

    // ── Diversity pass ───────────────────────────────────────
    for (let i = 1; i < interleaved.length; i++) {
      const prev = interleaved[i - 1];
      const curr = interleaved[i];
      if (curr.user_id === prev.user_id || curr.category === prev.category) {
        for (let j = i + 1; j < Math.min(i + 8, interleaved.length); j++) {
          if (
            interleaved[j].user_id !== prev.user_id &&
            interleaved[j].category !== prev.category
          ) {
            [interleaved[i], interleaved[j]] = [interleaved[j], interleaved[i]];
            break;
          }
        }
      }
    }

    // ── Paginate ─────────────────────────────────────────────
    const start = (page - 1) * PAGE_SIZE;
    const pageEntries = interleaved.slice(start, start + PAGE_SIZE);
    const hasMore = start + PAGE_SIZE < interleaved.length;

    // ── Assemble cards using denormalized profile data ───────
    // Fall back to profile collection for entries not yet migrated
    const needsProfileFetch: string[] = [];
    for (const e of pageEntries) {
      if (e.owner_display_name === undefined || e.owner_display_name === '') {
        needsProfileFetch.push(e.user_id);
      }
    }

    const fetchedProfiles: Record<string, { display_name: string; avatar_url: string | null }> = {};
    if (needsProfileFetch.length > 0) {
      const uniqueIds = [...new Set(needsProfileFetch)];
      await Promise.all(
        uniqueIds.map(async (uid) => {
          const snap = await db.collection('profiles').doc(uid).get();
          if (snap.exists) {
            const d = snap.data()!;
            fetchedProfiles[uid] = {
              display_name: d.display_name || '',
              avatar_url: d.avatar_url || null,
            };
          }
        }),
      );
    }

    const cards = pageEntries.map((e) => {
      const fallback = fetchedProfiles[e.user_id];
      return {
        profile: {
          id: e.user_id,
          display_name: e.owner_display_name || fallback?.display_name || '',
          avatar_url: e.owner_avatar_url ?? fallback?.avatar_url ?? null,
          created_at: '',
        },
        entry: {
          id: e.id,
          user_id: e.user_id,
          category: e.category,
          items: e.items,
          updated_at: e.updated_at,
          like_count: e.like_count,
        },
      };
    });

    return Response.json({ cards, page, hasMore, totalCards: interleaved.length });
  } catch (err) {
    console.error('[api/feed] Error:', err);
    return Response.json(
      { cards: [], error: (err as Error).message, page: 1, hasMore: false, totalCards: 0 },
      { status: 500 },
    );
  }
}
