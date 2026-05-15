import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  getDocs,
  where,
  limit,
  orderBy,
  serverTimestamp,
  increment,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import type { Category, Top4Item, UserProfile, Top4Entry, Top4Card } from '@/lib/types';

// ============================================
// Profiles
// ============================================

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'profiles', userId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    display_name: data.display_name || '',
    avatar_url: data.avatar_url || null,
    created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

export async function upsertProfile(userId: string, data: {
  display_name: string;
  avatar_url: string | null;
}) {
  await setDoc(doc(db, 'profiles', userId), {
    display_name: data.display_name,
    avatar_url: data.avatar_url,
    updated_at: serverTimestamp(),
  }, { merge: true });
}

export async function ensureProfile(userId: string, phoneNumber: string) {
  const existing = await getProfile(userId);
  if (!existing) {
    await setDoc(doc(db, 'profiles', userId), {
      display_name: '',
      avatar_url: null,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  }
}

// ============================================
// Top4 Entries
// ============================================

function entryDocId(userId: string, category: Category) {
  return `${userId}_${category}`;
}

export async function getEntries(userId: string): Promise<Top4Entry[]> {
  const entries: Top4Entry[] = [];
  for (const cat of ['movies', 'tv', 'artists', 'books'] as Category[]) {
    const snap = await getDoc(doc(db, 'top4_entries', entryDocId(userId, cat)));
    if (snap.exists()) {
      const data = snap.data();
      entries.push({
        id: snap.id,
        user_id: userId,
        category: cat,
        items: data.items || [],
        updated_at: data.updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        like_count: data.like_count || 0,
      });
    }
  }
  return entries;
}

export async function upsertEntry(userId: string, category: Category, items: Top4Item[]) {
  const docId = entryDocId(userId, category);
  await setDoc(doc(db, 'top4_entries', docId), {
    user_id: userId,
    category,
    items,
    updated_at: serverTimestamp(),
  }, { merge: true });
}

// ============================================
// Feed — Multi-bucket blended algorithm
// ============================================

type RawEntry = {
  id: string;
  user_id: string;
  category: Category;
  items: Top4Item[];
  updated_at: string;
  like_count: number;
};

/** Parse a Firestore doc into a RawEntry, or null if it has no real items. */
function parseEntryDoc(d: { id: string; data: () => Record<string, unknown> }): RawEntry | null {
  const data = d.data();
  const items = data.items as Top4Item[] | undefined;
  if (!items?.length || !items.some((i) => i.title)) return null;
  return {
    id: d.id,
    user_id: data.user_id as string,
    category: data.category as Category,
    items,
    updated_at: (data.updated_at as { toDate?: () => Date })?.toDate?.()?.toISOString() || new Date().toISOString(),
    like_count: (data.like_count as number) || 0,
  };
}

/**
 * Fetch feed cards using a multi-bucket strategy:
 *   🔥 Trending  — highest like_count
 *   ✨ Fresh     — most recently updated
 *   📚 Catalog   — oldest entries (resurface hidden gems)
 *
 * Results are deduplicated, then interleaved with diversity
 * rules so consecutive cards aren't from the same user or category.
 */
export async function getFeedCards(maxCards: number = 30): Promise<Top4Card[]> {
  const entriesCol = collection(db, 'top4_entries');
  const bucketSize = Math.ceil(maxCards * 0.45); // fetch a little more per bucket for dedup headroom

  // Fire all three queries in parallel
  const [trendingSnap, freshSnap, catalogSnap] = await Promise.all([
    getDocs(query(entriesCol, orderBy('like_count', 'desc'), limit(bucketSize))),
    getDocs(query(entriesCol, orderBy('updated_at', 'desc'), limit(bucketSize))),
    getDocs(query(entriesCol, orderBy('updated_at', 'asc'), limit(bucketSize))),
  ]);

  // Parse & deduplicate across buckets
  const seen = new Set<string>();
  const trending: RawEntry[] = [];
  const fresh: RawEntry[] = [];
  const catalog: RawEntry[] = [];

  for (const d of trendingSnap.docs) {
    const e = parseEntryDoc(d);
    if (e && !seen.has(e.id)) { seen.add(e.id); trending.push(e); }
  }
  for (const d of freshSnap.docs) {
    const e = parseEntryDoc(d);
    if (e && !seen.has(e.id)) { seen.add(e.id); fresh.push(e); }
  }
  for (const d of catalogSnap.docs) {
    const e = parseEntryDoc(d);
    if (e && !seen.has(e.id)) { seen.add(e.id); catalog.push(e); }
  }

  // Interleave pattern: T F T C F C ... (weighted ~35/35/30)
  const pattern = ['trending', 'fresh', 'trending', 'catalog', 'fresh', 'catalog'] as const;
  const queues = { trending: [...trending], fresh: [...fresh], catalog: [...catalog] };
  const interleaved: RawEntry[] = [];
  let pi = 0;

  while (interleaved.length < maxCards) {
    const bucket = pattern[pi % pattern.length];
    pi++;

    // Try the intended bucket first, then fall back to others
    let entry: RawEntry | undefined;
    if (queues[bucket].length > 0) {
      entry = queues[bucket].shift();
    } else {
      // Drain whichever bucket still has entries
      for (const key of ['fresh', 'trending', 'catalog'] as const) {
        if (queues[key].length > 0) { entry = queues[key].shift(); break; }
      }
    }
    if (!entry) break; // all buckets exhausted
    interleaved.push(entry);
  }

  // Diversity pass: avoid consecutive same-user or same-category cards
  // Simple bubble-swap: if card[i] violates, swap with the nearest non-violating card ahead
  for (let i = 1; i < interleaved.length; i++) {
    const prev = interleaved[i - 1];
    const curr = interleaved[i];
    if (curr.user_id === prev.user_id || curr.category === prev.category) {
      // Find the nearest swap candidate
      for (let j = i + 1; j < Math.min(i + 5, interleaved.length); j++) {
        if (interleaved[j].user_id !== prev.user_id && interleaved[j].category !== prev.category) {
          [interleaved[i], interleaved[j]] = [interleaved[j], interleaved[i]];
          break;
        }
      }
    }
  }

  // Batch-load profiles
  const userIds = new Set(interleaved.map((e) => e.user_id));
  const profiles = new Map<string, UserProfile>();
  await Promise.all(
    [...userIds].map(async (uid) => {
      const p = await getProfile(uid);
      if (p) profiles.set(uid, p);
    })
  );

  // Assemble cards
  const cards: Top4Card[] = [];
  for (const entry of interleaved) {
    const profile = profiles.get(entry.user_id);
    if (profile) cards.push({ profile, entry });
  }

  return cards;
}

// ============================================
// Likes
// ============================================

function likeDocId(userId: string, entryId: string) {
  return `${userId}_${entryId}`;
}

export async function likeEntry(
  likedBy: string,
  likedByName: string,
  entryId: string,
  ownerId: string,
  category: Category,
): Promise<void> {
  const likeRef = doc(db, 'likes', likeDocId(likedBy, entryId));
  if ((await getDoc(likeRef)).exists()) return; // idempotent

  await setDoc(likeRef, {
    liked_by: likedBy,
    liked_by_name: likedByName,
    entry_id: entryId,
    owner_id: ownerId,
    category,
    created_at: serverTimestamp(),
  });

  await setDoc(doc(db, 'top4_entries', entryId), { like_count: increment(1) }, { merge: true });

  // Notify the owner (skip self-likes)
  if (likedBy !== ownerId) {
    const notifRef = doc(collection(db, 'notifications', ownerId, 'items'));
    await setDoc(notifRef, {
      type: 'like',
      from_user_id: likedBy,
      from_display_name: likedByName,
      entry_id: entryId,
      category,
      read: false,
      created_at: serverTimestamp(),
    });
  }
}

export async function unlikeEntry(likedBy: string, entryId: string): Promise<void> {
  const likeRef = doc(db, 'likes', likeDocId(likedBy, entryId));
  if (!(await getDoc(likeRef)).exists()) return;
  await deleteDoc(likeRef);
  await setDoc(doc(db, 'top4_entries', entryId), { like_count: increment(-1) }, { merge: true });
}

export async function hasLiked(userId: string, entryId: string): Promise<boolean> {
  return (await getDoc(doc(db, 'likes', likeDocId(userId, entryId)))).exists();
}

export async function getLikedCards(userId: string): Promise<Top4Card[]> {
  const q = query(
    collection(db, 'likes'),
    where('liked_by', '==', userId),
    orderBy('created_at', 'desc'),
    limit(50),
  );
  const snap = await getDocs(q);
  if (snap.empty) return [];

  const cards: Top4Card[] = [];
  for (const d of snap.docs) {
    const entryId = d.data().entry_id as string;
    const entrySnap = await getDoc(doc(db, 'top4_entries', entryId));
    if (!entrySnap.exists()) continue;
    const data = entrySnap.data();
    const profile = await getProfile(data.user_id);
    if (profile) {
      cards.push({
        profile,
        entry: {
          id: entrySnap.id,
          user_id: data.user_id,
          category: data.category,
          items: data.items,
          updated_at: data.updated_at?.toDate?.()?.toISOString() || '',
          like_count: data.like_count || 0,
        },
      });
    }
  }
  return cards;
}

// ============================================
// Notifications
// ============================================

export type Notification = {
  id: string;
  type: 'like';
  from_display_name: string;
  from_user_id: string;
  entry_id: string;
  category: Category;
  read: boolean;
  created_at: string;
};

export function subscribeToNotifications(
  userId: string,
  callback: (notifs: Notification[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'notifications', userId, 'items'),
    orderBy('created_at', 'desc'),
    limit(20),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({
      id: d.id,
      type: d.data().type,
      from_display_name: d.data().from_display_name || 'Someone',
      from_user_id: d.data().from_user_id,
      entry_id: d.data().entry_id,
      category: d.data().category,
      read: d.data().read || false,
      created_at: d.data().created_at?.toDate?.()?.toISOString() || '',
    })));
  });
}

export async function markNotificationsRead(userId: string, notifIds: string[]): Promise<void> {
  await Promise.all(
    notifIds.map((id) =>
      setDoc(doc(db, 'notifications', userId, 'items', id), { read: true }, { merge: true })
    )
  );
}
