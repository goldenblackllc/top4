const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  credential: cert(require('/Users/davidjohnson/Downloads/top4-490eb-firebase-adminsdk-fbsvc-2f32398985.json')),
});

const db = getFirestore();
db.collection('page_views').count().get().then(snap => {
  console.log('Count:', snap.data().count);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
