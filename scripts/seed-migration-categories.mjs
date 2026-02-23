/**
 * ONE-TIME: Seed missing issue_categories required by the migration script.
 *
 * Adds 5 categories. Skips any that already exist (idempotent).
 * Does NOT modify issues or existing categories.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json
 *   node scripts/seed-migration-categories.mjs
 *
 * Delete this script after the migration is complete.
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const PROJECT_ID = 'exam-coach-ai-platform';

initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID,
});
const db = getFirestore();

const CATEGORIES = [
    {
        id: 'other',
        label: 'Other',
        description: 'Issues that do not fit any defined category.',
        status: 'active',
    },
    {
        id: 'content_quality',
        label: 'Content Quality',
        description: 'Incorrect, outdated, or misleading educational content.',
        status: 'active',
    },
    {
        id: 'admin_tooling',
        label: 'Admin / Tooling',
        description: 'Internal admin panel or tooling issues.',
        status: 'active',
    },
    {
        id: 'randomization_logic',
        label: 'Randomization / Logic',
        description: 'Question randomization, deduplication, or sequencing bugs.',
        status: 'active',
    },
    {
        id: 'trust_compliance',
        label: 'Trust / Compliance',
        description: 'Data privacy, trust signals, or compliance concerns.',
        status: 'active',
    },
];

async function main() {
    console.log(`Project: ${PROJECT_ID}`);
    console.log();

    let added = 0;
    let skipped = 0;

    for (const cat of CATEGORIES) {
        const ref = db.collection('issue_categories').doc(cat.id);
        const existing = await ref.get();

        if (existing.exists) {
            console.log(`  SKIP  ${cat.id} (already exists)`);
            skipped++;
            continue;
        }

        await ref.set({
            ...cat,
            createdAt: FieldValue.serverTimestamp(),
            createdBy: 'system',
        });
        console.log(`  ADD   ${cat.id} → "${cat.label}"`);
        added++;
    }

    console.log();
    console.log(`Done. Added: ${added}, Skipped: ${skipped}`);
}

main().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
