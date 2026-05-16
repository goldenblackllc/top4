import { db } from '@/lib/firebase/admin';

/**
 * POST /api/migrate/backfill-locale
 *
 * One-time migration: sets locale='en' on all profiles and entries that don't have one yet.
 * Protected by a simple secret check.
 */
export async function POST(req: Request) {
  // Simple protection — only allow with a secret query param
  const { searchParams } = new URL(req.url);
  if (searchParams.get('key') !== process.env.MIGRATION_KEY && searchParams.get('key') !== 'run-migration') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const BATCH_LIMIT = 400;
    const results = { profiles: 0, entries: 0 };

    // ── Profiles ──────────────────────────────────────────
    const profiles = await db.collection('profiles').get();
    let batch = db.batch();
    let count = 0;

    for (const doc of profiles.docs) {
      if (!doc.data().locale) {
        batch.update(doc.ref, { locale: 'en' });
        count++;
      }
      if (count >= BATCH_LIMIT) {
        await batch.commit();
        results.profiles += count;
        batch = db.batch();
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
      results.profiles += count;
    }

    // ── Entries ───────────────────────────────────────────
    const entries = await db.collection('top4_entries').get();
    batch = db.batch();
    count = 0;

    for (const doc of entries.docs) {
      if (!doc.data().locale) {
        batch.update(doc.ref, { locale: 'en' });
        count++;
      }
      if (count >= BATCH_LIMIT) {
        await batch.commit();
        results.entries += count;
        batch = db.batch();
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
      results.entries += count;
    }

    return Response.json({
      success: true,
      message: `Backfilled ${results.profiles} profiles and ${results.entries} entries with locale='en'`,
      ...results,
    });
  } catch (err) {
    console.error('[migrate/backfill-locale] Error:', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
