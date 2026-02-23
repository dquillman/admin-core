/**
 * ONE-TIME MIGRATION: Normalize issue category (type) values.
 *
 * Reads all issues, checks each `type` field against the `issue_categories`
 * registry, and remaps invalid/free-text values to valid category IDs.
 *
 * SAFE BY DEFAULT — runs in DRY RUN mode unless --commit is passed.
 *
 * Usage:
 *   node scripts/migrate-issue-categories.mjs                  # dry run
 *   node scripts/migrate-issue-categories.mjs --commit         # live write
 *
 * Prerequisites:
 *   export GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json
 *
 * Delete this script after successful migration.
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ---------------------------------------------------------------------------
// 1. CONFIG
// ---------------------------------------------------------------------------

const COMMIT = process.argv.includes('--commit');
const BATCH_SIZE = 400; // Firestore batch limit is 500; leave margin

// Free-text source value → valid category slug ID.
// Keys are LOWERCASED for case-insensitive matching.
// Targets must be valid IDs in the `issue_categories` collection.
const CATEGORY_MAP = {
    // User-specified mappings (label-style free text → registry slug)
    'quiz / questions':     'quiz_assessment_logic',
    'quiz / assessment':    'quiz_assessment_logic',
    'content':              'content_quality',
    'content quality':      'content_quality',
    'repetition / logic':   'randomization_logic',
    'randomization / logic':'randomization_logic',
    'trust':                'trust_compliance',
    'trust / compliance':   'trust_compliance',
    'admin':                'admin_tooling',
    'admin / tooling':      'admin_tooling',
    'ui / ux':              'user_interface_ux',
    'ui':                   'user_interface_ux',
    'ux':                   'user_interface_ux',
    'performance':          'performance_stability',

    // Legacy enum values from the old ReportedIssue type definition
    'bug':                  'other',
    'confusion':            'other',
    'feedback':             'other',
    'accessibility':        'other',
    'tutor-gap':            'tutor_ai_output',
    'mobile':               'other',

    // Explicit catch-all aliases
    'uncategorized':        'other',
    '':                     'other',
};

const FALLBACK_ID = 'other';

// ---------------------------------------------------------------------------
// 2. INIT
// ---------------------------------------------------------------------------

// EXPLICIT project ID — must match what the Admin Core UI connects to.
// This prevents silent mismatches from ambient gcloud config or wrong
// service account keys.
const PROJECT_ID = 'exam-coach-ai-platform';

initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID,
});
const db = getFirestore();

// ---------------------------------------------------------------------------
// 3. MAIN
// ---------------------------------------------------------------------------

async function main() {
    console.log('='.repeat(60));
    console.log(`  Project: ${PROJECT_ID}`);
    console.log(COMMIT
        ? '  LIVE MODE — changes WILL be written to Firestore'
        : '  DRY RUN — no changes will be written (pass --commit to apply)');
    console.log('='.repeat(60));
    console.log();

    // 3a. Sanity check — verify we can reach the project and it has data
    const usersProbe = await db.collection('users').limit(1).get();
    if (usersProbe.empty) {
        console.error('[ABORT] The "users" collection is empty or unreachable.');
        console.error('  This likely means credentials resolve to the wrong project,');
        console.error('  or GOOGLE_APPLICATION_CREDENTIALS is not set.');
        console.error(`  Expected project: ${PROJECT_ID}`);
        process.exit(1);
    }
    console.log(`[OK] Connected to project "${PROJECT_ID}" (users collection reachable).`);
    console.log();

    // 3b. Load valid category IDs from the registry
    const catSnap = await db.collection('issue_categories').get();
    const validIds = new Set();
    catSnap.forEach(doc => validIds.add(doc.id));

    console.log(`[Registry] ${validIds.size} valid categories found:`);
    console.log(`  ${[...validIds].join(', ')}`);
    console.log();

    // Warn if any mapping target doesn't exist in the registry
    const allTargets = new Set(Object.values(CATEGORY_MAP));
    allTargets.add(FALLBACK_ID);
    for (const target of allTargets) {
        if (!validIds.has(target)) {
            console.warn(`  [WARN] Mapping target "${target}" does not exist in issue_categories. Issues will be tagged but may show as Uncategorized in UI.`);
        }
    }
    console.log();

    // 3b. Read all issues
    const issuesSnap = await db.collection('issues').get();
    console.log(`[Issues] ${issuesSnap.size} documents found.`);
    console.log();

    let scanned = 0;
    let skippedValid = 0;
    let skippedNoType = 0;
    let updated = 0;
    const mappingLog = [];    // { id, from, to }
    const unknownValues = {}; // free-text value → count (for audit)

    const pendingWrites = [];

    issuesSnap.forEach(docSnap => {
        scanned++;
        const data = docSnap.data();
        const currentType = data.type;

        // No type field at all — map to fallback
        if (currentType === undefined || currentType === null) {
            skippedNoType++;
            const target = FALLBACK_ID;
            pendingWrites.push({ ref: docSnap.ref, id: docSnap.id, from: '(missing)', to: target });
            mappingLog.push({ id: docSnap.id, from: '(missing)', to: target });
            updated++;
            return;
        }

        // Already a valid category ID — no change needed
        if (validIds.has(currentType)) {
            skippedValid++;
            return;
        }

        // Try the explicit mapping (case-insensitive)
        const key = String(currentType).trim().toLowerCase();
        const mappedId = CATEGORY_MAP[key];

        if (mappedId) {
            pendingWrites.push({ ref: docSnap.ref, id: docSnap.id, from: currentType, to: mappedId });
            mappingLog.push({ id: docSnap.id, from: currentType, to: mappedId });
            updated++;
        } else {
            // No mapping found — apply fallback
            unknownValues[currentType] = (unknownValues[currentType] || 0) + 1;
            pendingWrites.push({ ref: docSnap.ref, id: docSnap.id, from: currentType, to: FALLBACK_ID });
            mappingLog.push({ id: docSnap.id, from: currentType, to: FALLBACK_ID });
            updated++;
        }
    });

    // 3c. Report
    console.log('-'.repeat(60));
    console.log('  MIGRATION REPORT');
    console.log('-'.repeat(60));
    console.log(`  Scanned:          ${scanned}`);
    console.log(`  Already valid:    ${skippedValid}`);
    console.log(`  Missing type:     ${skippedNoType}`);
    console.log(`  To update:        ${updated}`);
    console.log();

    if (mappingLog.length > 0) {
        console.log('  Mapping results:');
        // Group by from→to for a compact summary
        const summary = {};
        for (const entry of mappingLog) {
            const key = `"${entry.from}" → "${entry.to}"`;
            summary[key] = (summary[key] || 0) + 1;
        }
        for (const [mapping, count] of Object.entries(summary)) {
            console.log(`    ${mapping}  (${count} issue${count > 1 ? 's' : ''})`);
        }
        console.log();
    }

    if (Object.keys(unknownValues).length > 0) {
        console.log('  Unmapped values (fell through to fallback):');
        for (const [val, count] of Object.entries(unknownValues)) {
            console.log(`    "${val}"  (${count})`);
        }
        console.log();
    }

    // 3d. Write (if --commit)
    if (pendingWrites.length === 0) {
        console.log('Nothing to update. All issues already have valid categories.');
        return;
    }

    if (!COMMIT) {
        console.log(`DRY RUN complete. ${pendingWrites.length} issue(s) would be updated.`);
        console.log('Run with --commit to apply changes.');
        return;
    }

    console.log(`Writing ${pendingWrites.length} update(s) in batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < pendingWrites.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = pendingWrites.slice(i, i + BATCH_SIZE);

        for (const { ref, to } of chunk) {
            batch.update(ref, {
                type: to,
                _categoryMigratedAt: FieldValue.serverTimestamp(),
            });
        }

        await batch.commit();
        console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: committed ${chunk.length} writes.`);
    }

    console.log();
    console.log(`Done. ${pendingWrites.length} issue(s) updated.`);
}

main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
