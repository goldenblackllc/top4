import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const NUM_SHARDS = 10;

/**
 * POST /api/like — Like or unlike an entry using distributed counters.
 *
 * Instead of writing directly to the entry's `like_count` (which is limited
 * to 1 write/sec/doc), likes are written to a random shard subcollection.
 * A cron job (/api/cron/aggregate-likes) periodically sums the shards
 * and updates the canonical `like_count` on the parent entry.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, likedBy, likedByName, entryId, ownerId, category } = body;

    if (!likedBy || !entryId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const likeDocId = `${likedBy}_${entryId}`;
    const likeRef = db.collection('likes').doc(likeDocId);
    const entryRef = db.collection('top4_entries').doc(entryId);

    // Pick a random shard for this write
    const shardId = String(Math.floor(Math.random() * NUM_SHARDS));
    const shardRef = entryRef.collection('like_shards').doc(shardId);

    if (action === 'unlike') {
      const likeSnap = await likeRef.get();
      if (!likeSnap.exists) {
        return Response.json({ ok: true, alreadyUnliked: true });
      }
      await likeRef.delete();

      // Decrement a random shard
      await shardRef.set({ count: FieldValue.increment(-1) }, { merge: true });

      // Mark entry for aggregation
      await db.collection('pending_like_updates').doc(entryId).set({
        updated_at: FieldValue.serverTimestamp(),
      });

      return Response.json({ ok: true });
    }

    // ── Like action ──────────────────────────────────────────
    const likeSnap = await likeRef.get();
    if (likeSnap.exists) {
      return Response.json({ ok: true, alreadyLiked: true });
    }

    await likeRef.set({
      liked_by: likedBy,
      liked_by_name: likedByName || 'Someone',
      entry_id: entryId,
      owner_id: ownerId,
      category,
      created_at: FieldValue.serverTimestamp(),
    });

    // Increment a random shard (instead of the entry doc directly)
    await shardRef.set({ count: FieldValue.increment(1) }, { merge: true });

    // Mark entry for aggregation
    await db.collection('pending_like_updates').doc(entryId).set({
      updated_at: FieldValue.serverTimestamp(),
    });

    // Create notification for the owner (skip self-likes)
    if (likedBy !== ownerId) {
      const notifRef = db.collection('notifications').doc(ownerId).collection('items').doc();
      await notifRef.set({
        type: 'like',
        from_user_id: likedBy,
        from_display_name: likedByName || 'Someone',
        entry_id: entryId,
        category,
        read: false,
        created_at: FieldValue.serverTimestamp(),
      });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[api/like] Error:', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}

// Check if user has liked an entry
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const entryId = searchParams.get('entryId');

    if (!userId || !entryId) {
      return Response.json({ error: 'Missing userId or entryId' }, { status: 400 });
    }

    const likeDocId = `${userId}_${entryId}`;
    const snap = await db.collection('likes').doc(likeDocId).get();

    return Response.json({ liked: snap.exists });
  } catch (err) {
    console.error('[api/like] GET Error:', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
