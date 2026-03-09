const admin = require("firebase-admin");

admin.initializeApp({
  projectId: "exam-coach-ai-platform"
});

const db = admin.firestore();

console.log("==== FIRESTORE CONNECTION INFO ====");
console.log("Project ID:", admin.app().options.projectId);
console.log("Database ID:", db._settings?.databaseId || "(default)");
console.log("====================================\n");

async function checkStructure() {
  console.log("Checking top-level collections...\n");

  const collections = await db.listCollections();

  if (collections.length === 0) {
    console.log("No top-level collections found.");
  }

  for (const col of collections) {
    console.log("Collection:", col.id);
  }

  console.log("\nChecking collectionGroup('runs')...\n");

  const snapshot = await db.collectionGroup("runs").limit(5).get();

  console.log("Found run docs:", snapshot.size);

  snapshot.forEach(doc => {
    console.log("Sample run path:", doc.ref.path);
  });

  console.log("\nChecking for quizRuns root collection...\n");

  const quizRunsRef = db.collection("quizRuns");
  const quizRunsSnapshot = await quizRunsRef.limit(5).get();

  console.log("quizRuns root docs:", quizRunsSnapshot.size);

  quizRunsSnapshot.forEach(doc => {
    console.log("quizRuns root doc:", doc.id);
  });

  console.log("\nDone.");
  process.exit(0);
}

checkStructure().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
