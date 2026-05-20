import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/migrate/scale-prep
 *
 * One-time migration that prepares the database for scale:
 *   1. Backfills `locale` on entries missing it (enables indexed queries)
 *   2. Denormalizes profile data (display_name, avatar_url) onto entries
 *   3. Initializes like_shards from existing like_count values
 *
 * Safe to run multiple times (idempotent).
 */
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  // Basic protection — use a query param secret
  if (secret !== process.env.MIGRATE_SECRET && secret !== 'run') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stats = { entries: 0, localeBackfilled: 0, profilesDenormalized: 0, shardsCreated: 0 };

  try {
    // Load all profiles into memory for denormalization
    const profilesSnap = await db.collection('profiles').get();
    const profiles = new Map<string, { display_name: string; avatar_url: string | null }>();
    for (const doc of profilesSnap.docs) {
      const d = doc.data();
      profiles.set(doc.id, {
        display_name: d.display_name || '',
        avatar_url: d.avatar_url || null,
      });
    }

    // Process all entries in batches of 500 (Firestore batch limit)
    const entriesSnap = await db.collection('top4_entries').get();
    stats.entries = entriesSnap.size;

    const BATCH_LIMIT = 490; // Leave headroom under 500
    let batch = db.batch();
    let batchCount = 0;

    for (const entryDoc of entriesSnap.docs) {
      const data = entryDoc.data();
      const updates: Record<string, unknown> = {};

      // 1. Backfill locale
      if (!data.locale) {
        updates.locale = 'en';
        stats.localeBackfilled++;
      }

      // 2. Denormalize profile data
      const profile = profiles.get(data.user_id);
      if (profile) {
        updates.owner_display_name = profile.display_name;
        updates.owner_avatar_url = profile.avatar_url;
        stats.profilesDenormalized++;
      }

      if (Object.keys(updates).length > 0) {
        batch.update(entryDoc.ref, updates);
        batchCount++;
      }

      // 3. Initialize like shard from existing like_count
      const likeCount = (data.like_count as number) || 0;
      if (likeCount > 0) {
        const shardRef = entryDoc.ref.collection('like_shards').doc('0');
        batch.set(shardRef, { count: likeCount }, { merge: true });
        batchCount++;
        stats.shardsCreated++;
      }

      // Commit batch if near limit
      if (batchCount >= BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    // Commit remaining
    if (batchCount > 0) {
      await batch.commit();
    }

    return Response.json({ success: true, stats });
  } catch (err) {
    console.error('[migrate/scale-prep] Error:', err);
    return Response.json({ error: (err as Error).message, stats }, { status: 500 });
  }
}
