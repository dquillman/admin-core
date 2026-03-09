const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

async function backfillRIV() {
  const snapshot = await db.collection("issues").get();

  let updated = 0;
  let manual = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();

    const status = data.status;
    const pfv = data.plannedForVersion;
    const riv = data.releasedInVersion;

    if (status === "released") {
      if (!riv) {
        if (pfv) {
          await doc.ref.update({
            releasedInVersion: pfv
          });
          console.log(`UPDATED: ${data.displayId} → RIV = ${pfv}`);
          updated++;
        } else {
          manual.push(data.displayId || doc.id);
        }
      }
    }
  }

  console.log("\n--------------------------");
  console.log(`Backfill complete.`);
  console.log(`Updated: ${updated}`);
  console.log(`Manual Review Needed: ${manual.length}`);
  
  if (manual.length > 0) {
    console.log("\nIssues needing manual RIV:");
    manual.forEach(id => console.log(` - ${id}`));
  }

  process.exit();
}

backfillRIV().catch(err => {
  console.error(err);
  process.exit(1);
});
