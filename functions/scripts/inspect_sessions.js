const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'exam-coach-ai-platform'
});

const db = admin.firestore();

async function run() {
  console.log("=== CHECKING user_sessions ===");

  const userSessionsSnap = await db.collection('user_sessions').limit(5).get();
  console.log("user_sessions count:", userSessionsSnap.size);

  userSessionsSnap.forEach(doc => {
    console.log("Sample user_sessions doc:", doc.id, doc.data());
  });

  console.log("\n=== CHECKING quizRuns collectionGroup('runs') ===");

  const runsSnap = await db.collectionGroup('runs').limit(5).get();
  console.log("runs count:", runsSnap.size);

  runsSnap.forEach(doc => {
    console.log("Sample run doc path:", doc.ref.path);
    console.log("Data:", doc.data());
  });

  process.exit();
}

run();
