
const admin = require("firebase-admin");

admin.initializeApp({
  projectId: "exam-coach-ai-platform"
});

const db = admin.firestore();

// ===== CONFIG =====
const USAGE_SCORE = {
  completion: 5,
  session: 1,
  coreAction: 2
};
// ==================

async function runBackfill() {
  console.log("Reading quizRuns collectionGroup('runs')...");

  const snapshot = await db.collectionGroup("runs").get();

  console.log(`Found ${snapshot.size} run documents.`);

  if (snapshot.empty) {
    console.log("No runs found. Nothing to backfill.");
    process.exit(0);
  }

  const userScores = {};

  snapshot.forEach(doc => {
    const data = doc.data();
    const userId = doc.ref.parent.parent.id; // quizRuns/{uid}/runs/{runId}

    if (!userId) return;

    if (!userScores[userId]) {
      userScores[userId] = 0;
    }

    // Treat completed runs as completion events
    if (data.status === "completed") {
      userScores[userId] += USAGE_SCORE.completion;
    }
  });

  console.log("Updating user usageScore...");

  for (const userId of Object.keys(userScores)) {
    const score = userScores[userId];

    await db.collection("users").doc(userId).set(
      { usageScore: score },
      { merge: true }
    );

    console.log(`Updated ${userId} → usageScore: ${score}`);
  }

  console.log("Backfill complete.");
  process.exit(0);
}

runBackfill().catch(err => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
