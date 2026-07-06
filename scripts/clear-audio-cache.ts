/**
 * Clear all entries from the audio_cache Firestore collection
 * so they get re-resolved with improved search logic.
 *
 * Run: npx tsx scripts/clear-audio-cache.ts
 */
import { db } from '../src/lib/firebase/admin';

async function main() {
  const snapshot = await db.collection('audio_cache').get();
  console.log(`Found ${snapshot.size} cached entries`);

  if (snapshot.empty) {
    console.log('Nothing to clear.');
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    console.log(`  Deleting: ${doc.id}`);
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`Cleared ${snapshot.size} entries from audio_cache`);
}

main().catch(console.error);
