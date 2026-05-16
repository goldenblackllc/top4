import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

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

    if (action === 'unlike') {
      const likeSnap = await likeRef.get();
      if (!likeSnap.exists) {
        return Response.json({ ok: true, alreadyUnliked: true });
      }
      await likeRef.delete();
      await entryRef.set({ like_count: FieldValue.increment(-1) }, { merge: true });
      return Response.json({ ok: true });
    }

    // Like action
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

    await entryRef.set({ like_count: FieldValue.increment(1) }, { merge: true });

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
