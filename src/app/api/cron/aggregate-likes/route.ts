import { db } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/aggregate-likes
 *
 * Processes entries flagged in `pending_like_updates`:
 *   1. Sums all like_shards for the entry
 *   2. Writes the total to the entry's `like_count`
 *   3. Deletes the pending marker
 *
 * Run every 60 seconds via Vercel Cron or an external scheduler.
 * Safe to run concurrently — each entry is processed independently.
 */
export async function GET(request: Request) {
  // Verify cron secret (Vercel sends it as Authorization: Bearer <token>)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stats = { processed: 0, errors: 0 };

  try {
    // Get all entries pending aggregation
    const pendingSnap = await db.collection('pending_like_updates').limit(200).get();

    if (pendingSnap.empty) {
      return Response.json({ message: 'No pending updates', stats });
    }

    const batch = db.batch();

    for (const pendingDoc of pendingSnap.docs) {
      const entryId = pendingDoc.id;

      try {
        // Sum all shards for this entry
        const shardsSnap = await db
          .collection('top4_entries')
          .doc(entryId)
          .collection('like_shards')
          .get();

        const total = shardsSnap.docs.reduce((sum, d) => {
          return sum + ((d.data().count as number) || 0);
        }, 0);

        // Update the canonical like_count
        batch.update(db.collection('top4_entries').doc(entryId), {
          like_count: Math.max(0, total), // Never go negative
        });

        // Remove the pending marker
        batch.delete(pendingDoc.ref);
        stats.processed++;
      } catch (err) {
        console.error(`[aggregate-likes] Error processing ${entryId}:`, err);
        stats.errors++;
      }
    }

    await batch.commit();

    return Response.json({ success: true, stats });
  } catch (err) {
    console.error('[aggregate-likes] Error:', err);
    return Response.json({ error: (err as Error).message, stats }, { status: 500 });
  }
}
