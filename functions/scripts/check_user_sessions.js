const admin = require("firebase-admin");

admin.initializeApp({
  projectId: "exam-coach-ai-platform"
});

const db = admin.firestore();

async function checkSessions() {
  console.log("==== CHECKING user_sessions COLLECTION ====\n");

  const snapshot = await db.collection("user_sessions").limit(20).get();

  console.log("Total docs found (limit 20):", snapshot.size);

  if (snapshot.empty) {
    console.log("⚠️  user_sessions is EMPTY.");
    process.exit(0);
  }

  snapshot.forEach(doc => {
    console.log("\nDoc ID:", doc.id);
    console.log("Data:", doc.data());
  });

  console.log("\nDone.");
  process.exit(0);
}

checkSessions().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
