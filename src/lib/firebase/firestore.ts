import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  getDocs,
  limit,
  serverTimestamp,
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
      display_name: '', // user will set their name on the profile page
      avatar_url: null,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  }
}

// ============================================
// Top4 Entries
// ============================================

/** Doc ID = {userId}_{category} for easy upserts */
function entryDocId(userId: string, category: Category) {
  return `${userId}_${category}`;
}

export async function getEntries(userId: string): Promise<Top4Entry[]> {
  const entries: Top4Entry[] = [];
  for (const cat of ['movies', 'artists', 'books'] as Category[]) {
    const snap = await getDoc(doc(db, 'top4_entries', entryDocId(userId, cat)));
    if (snap.exists()) {
      const data = snap.data();
      entries.push({
        id: snap.id,
        user_id: userId,
        category: cat,
        items: data.items || [],
        updated_at: data.updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
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
// Feed
// ============================================

export async function getFeedCards(maxCards: number = 30): Promise<Top4Card[]> {
  const q = query(collection(db, 'top4_entries'), limit(maxCards));
  const snap = await getDocs(q);

  if (snap.empty) return [];

  // Collect unique user IDs
  const userIds = new Set<string>();
  const rawEntries: { user_id: string; category: Category; items: Top4Item[]; updated_at: string; id: string }[] = [];

  snap.forEach((doc) => {
    const data = doc.data();
    if (data.items?.length > 0 && data.items.some((i: Top4Item) => i.title)) {
      userIds.add(data.user_id);
      rawEntries.push({
        id: doc.id,
        user_id: data.user_id,
        category: data.category,
        items: data.items,
        updated_at: data.updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
      });
    }
  });

  // Fetch profiles for all users
  const profiles = new Map<string, UserProfile>();
  for (const uid of userIds) {
    const profile = await getProfile(uid);
    if (profile) profiles.set(uid, profile);
  }

  // Build cards
  const cards: Top4Card[] = [];
  for (const entry of rawEntries) {
    const profile = profiles.get(entry.user_id);
    if (profile) {
      cards.push({ profile, entry });
    }
  }

  return cards;
}
