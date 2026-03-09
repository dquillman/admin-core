const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'exam-coach-ai-platform' });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('issues').get();
  let updated = 0;

  for (const doc of snap.docs) {
    const data = doc.data();

    if (!Object.prototype.hasOwnProperty.call(data, 'plannedForVersion')) {
      await doc.ref.update({
        plannedForVersion: null
      });
      updated++;
      console.log(`Updated ${doc.id}`);
    }
  }

  console.log(`\nDone. Updated ${updated} documents.`);
  process.exit(0);
})();
