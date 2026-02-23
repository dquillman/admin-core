/**
 * Seed / update the system_config/app_versions document.
 *
 * Defines the authoritative latest-only version for each connected app.
 * Connected apps read this value to enforce version compliance.
 *
 * Usage:
 *   cd functions
 *   npm run seed:versions
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS or Firebase CLI auth.
 */

import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

const DOC_PATH = 'system_config/app_versions';
const VERSION = '1.14.0';

async function main() {
    const ref = db.doc(DOC_PATH);

    await ref.set(
        {
            examcoach: {
                currentVersion: VERSION,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
        },
        { merge: true },
    );

    console.log(`[OK] ${DOC_PATH}`);
    console.log(`     examcoach.currentVersion = "${VERSION}"`);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Seed failed:', err);
        process.exit(1);
    });
