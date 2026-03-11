// Issues management service — CRUD, categories, versions, PFV/RIV
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    setDoc,
    arrayUnion,
    type QueryDocumentSnapshot,
    type QueryConstraint,
    type DocumentReference,
    db,
    auth,
    safeGetDocs,
    requireAdmin,
    logGlobalAdminAction,
    normalizeIssueStatus,
    stripImmutableFields,
    resolveDisplayId,
    normalizeAppValue,
    getAppPrefix,
    APP_KEYS,
    type ReportedIssue,
    type IssueNote,
    type IssueCategory,
    type ReleaseVersion,
    type ReleaseVersionStatus,
    type AppKey,
    writeBatch,
    safeGetDoc,
} from './adminUtils';

// --- Issues Management Service (Read-Only + Notes) ---
export const getReportedIssues = async (limitCount: number = 100): Promise<ReportedIssue[]> => {
    try {
        const issuesCol = collection(db, 'issues');
        // Client uses 'timestamp', Admin uses 'createdAt'. Order by timestamp for client issues.
        const q = query(issuesCol, orderBy('timestamp', 'desc'), limit(limitCount));
        const snap = await safeGetDocs(q, { fallback: [], context: 'Issues', description: 'Get Issues' });
        return snap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                displayId: resolveDisplayId(data, doc.id)
            } as ReportedIssue;
        });
    } catch (error) {
        console.error("Failed to fetch reported issues:", error);
        return [];
    }
};

export const addIssueNote = async (issueId: string, text: string) => {
    await requireAdmin();
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");

    const trimmed = text.trim();
    if (!trimmed) throw new Error("Note text cannot be empty");
    if (trimmed.length > 10000) throw new Error("Note text exceeds maximum length of 10,000 characters");

    const note: IssueNote = {
        text: trimmed,
        adminUid: user.uid,
        createdAt: Timestamp.now()
    };

    const issueRef = doc(db, 'issues', issueId);
    await updateDoc(issueRef, {
        notes: arrayUnion(note)
    });
};

export const updateIssueStatus = async (issueId: string, status: string) => {
    await requireAdmin();
    await updateDoc(doc(db, 'issues', issueId), { status });
};

export const updateIssueDetails = async (issueId: string, updates: { severity?: string; type?: string; classification?: string; userId?: string | null; plannedForVersion?: string | null }) => {
    await requireAdmin();
    // Guard: Strip any identity fields that might be accidentally included
    const safeUpdates = stripImmutableFields(updates);
    await updateDoc(doc(db, 'issues', issueId), safeUpdates);
};

export const deleteIssue = async (issueId: string) => {
    await requireAdmin();
    // Soft delete to allow recovery if needed, and to maintain history
    await updateDoc(doc(db, 'issues', issueId), { deleted: true });
};

// Parse a numeric issue number from a displayId like "EC-42" given a prefix like "EC".
// Returns the number (e.g. 42) or null if the string doesn't match.
const parseIssueNumber = (displayId: string, prefix: string): number | null => {
    const match = displayId.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (!match) return null;
    const num = parseInt(match[1], 10);
    return isNaN(num) ? null : num;
};

// Scan ALL issues to find the true maximum number for a given prefix.
// Uses no orderBy (avoids excluding docs without the ordered field)
// and no limit (avoids missing older high-numbered issues).
const getMaxIssueNumber = async (prefix: string = 'EC'): Promise<number> => {
    const issuesCol = collection(db, 'issues');
    const snap = await safeGetDocs(issuesCol, { fallback: [], context: 'Issues', description: 'Get Max Issue Number' });

    let maxId = 0;
    snap.docs.forEach(d => {
        const data = d.data();
        const idStr = data.displayId || data.issueId || data.issue_id;
        if (idStr && typeof idStr === 'string') {
            const num = parseIssueNumber(idStr, prefix);
            if (num !== null && num > maxId) maxId = num;
        }
    });
    return maxId;
};

// Create a new issue with auto-generated ID based on app prefix
export const createIssue = async (data: {
    app: AppKey;
    title: string;
    description?: string;
    telemetry?: { os?: string; browser?: string; environment?: string; submittedFrom?: string; userAgent?: string; examId?: string };
}): Promise<string> => {
    await requireAdmin();

    // Validate title is non-empty
    if (!data.title || !data.title.trim()) {
        throw new Error('Issue title is required and cannot be empty.');
    }

    // Validate app key
    if (!APP_KEYS.includes(data.app)) {
        throw new Error(`Invalid app key: ${data.app}. Must be one of: ${APP_KEYS.join(', ')}`);
    }

    // Get prefix from registry
    const prefix = getAppPrefix(data.app);

    // Find max ID for this prefix (delegates to getMaxIssueNumber instead of inline full scan)
    const issuesCol = collection(db, 'issues');
    const maxId = await getMaxIssueNumber(prefix);

    const displayId = `${prefix}-${maxId + 1}`;

    const issueDoc = await addDoc(issuesCol, {
        app: data.app, // Canonical key stored
        message: data.title,
        description: data.description || '',
        displayId,
        issueId: displayId,
        status: 'new',
        severity: 'S2',
        type: 'Uncategorized',
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        notes: [],
        // Telemetry (auto-captured)
        ...(data.telemetry?.os && { os: data.telemetry.os }),
        ...(data.telemetry?.browser && { browser: data.telemetry.browser }),
        ...(data.telemetry?.environment && { environment: data.telemetry.environment }),
        ...(data.telemetry?.submittedFrom && { submittedFrom: data.telemetry.submittedFrom }),
        ...(data.telemetry?.userAgent && { userAgent: data.telemetry.userAgent }),
        ...(data.telemetry?.examId && { examId: data.telemetry.examId }),
    });

    return issueDoc.id;
};

export const subscribeToReportedIssues = (limitCount: number = 100, onData: (issues: ReportedIssue[]) => void): (() => void) => {
    const issuesCol = collection(db, 'issues');
    const q = query(issuesCol, orderBy('timestamp', 'desc'), limit(limitCount));

    return onSnapshot(q, (snapshot) => {
        const issues = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                displayId: resolveDisplayId(data, doc.id)
            } as ReportedIssue;
        });
        onData(issues);
    }, (error) => {
        console.error("Issues subscription error:", error);
    });
};

export const assignMissingIssueIds = async (): Promise<number> => {
    await requireAdmin();

    const issuesCol = collection(db, 'issues');
    const snap = await safeGetDocs(issuesCol, { fallback: [], context: 'Issues', description: 'Assign IDs Check' });

    // Group docs missing displayIds by their app prefix, and derive max ID per prefix from the same snapshot
    const missingByPrefix = new Map<string, QueryDocumentSnapshot[]>();
    const maxByPrefix = new Map<string, number>();
    snap.docs.forEach(d => {
        const data = d.data();
        const idStr = data.displayId || data.issueId || data.issue_id;
        if (!idStr) {
            const appKey = data.app as AppKey | undefined;
            const prefix = appKey && APP_KEYS.includes(appKey) ? getAppPrefix(appKey) : 'EC';
            if (!missingByPrefix.has(prefix)) missingByPrefix.set(prefix, []);
            missingByPrefix.get(prefix)!.push(d);
        }
        // Track max issue number per prefix from existing docs
        if (idStr && typeof idStr === 'string') {
            const match = idStr.match(/^([A-Z]+)-(\d+)$/);
            if (match) {
                const p = match[1];
                const num = parseInt(match[2], 10);
                if (!isNaN(num) && num > (maxByPrefix.get(p) || 0)) {
                    maxByPrefix.set(p, num);
                }
            }
        }
    });

    let totalAssigned = 0;
    for (const [prefix, docs] of missingByPrefix) {
        if (docs.length === 0) continue;

        let nextId = (maxByPrefix.get(prefix) || 0) + 1;

        const batch = writeBatch(db);
        for (const docSnap of docs) {
            const newDisplayId = `${prefix}-${nextId}`;
            batch.update(docSnap.ref, {
                displayId: newDisplayId,
                issueId: newDisplayId,
                timestamp: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            nextId++;
        }
        await batch.commit();
        totalAssigned += docs.length;
    }

    return totalAssigned;
};

// One-time repair: detect duplicate displayIds and reassign new unique numbers to extras.
export const repairDuplicateIssueIds = async (): Promise<{ fixed: number; log: string[] }> => {
    await requireAdmin();

    const issuesCol = collection(db, 'issues');
    const snap = await safeGetDocs(issuesCol, { fallback: [], context: 'Issues', description: 'Repair Duplicate IDs' });

    // Group docs by prefix, then find duplicates within each prefix
    // key = "PREFIX-NUM", value = list of {ref, ts, prefix, num}
    const byPrefix = new Map<string, Map<number, { ref: DocumentReference; ts: number }[]>>();

    snap.docs.forEach(d => {
        const data = d.data();
        const idStr = data.displayId || data.issueId || data.issue_id;
        if (idStr && typeof idStr === 'string') {
            const match = idStr.match(/^([A-Z]+)-(\d+)$/);
            if (match) {
                const prefix = match[1];
                const num = parseInt(match[2], 10);
                if (!isNaN(num)) {
                    if (!byPrefix.has(prefix)) byPrefix.set(prefix, new Map());
                    const idMap = byPrefix.get(prefix)!;
                    const ts = data.timestamp?.toMillis?.() || data.createdAt?.toMillis?.() || 0;
                    const list = idMap.get(num) || [];
                    list.push({ ref: d.ref, ts });
                    idMap.set(num, list);
                }
            }
        }
    });

    const logEntries: string[] = [];
    const batch = writeBatch(db);
    let writeCount = 0;

    for (const [prefix, idMap] of byPrefix) {
        // Find duplicates within this prefix
        const duplicates: { num: number; docs: { ref: DocumentReference; ts: number }[] }[] = [];
        idMap.forEach((docs, num) => {
            if (docs.length > 1) duplicates.push({ num, docs });
        });

        if (duplicates.length === 0) continue;

        // Max for this prefix
        let maxId = 0;
        idMap.forEach((_, num) => { if (num > maxId) maxId = num; });
        let nextId = maxId + 1;

        duplicates.forEach(({ num, docs }) => {
            // Oldest keeps the original ID
            docs.sort((a, b) => a.ts - b.ts);
            for (let i = 1; i < docs.length; i++) {
                const newId = `${prefix}-${nextId}`;
                batch.update(docs[i].ref, {
                    displayId: newId,
                    issueId: newId,
                    updatedAt: serverTimestamp()
                });
                logEntries.push(`${prefix}-${num} (duplicate #${i}) → ${newId}`);
                nextId++;
                writeCount++;
            }
        });
    }

    if (writeCount === 0) {
        return { fixed: 0, log: ['No duplicate issue IDs found.'] };
    }

    if (writeCount > 500) {
        return { fixed: 0, log: ['Too many duplicates for single batch (>500). Manual intervention needed.'] };
    }

    await batch.commit();
    return { fixed: writeCount, log: logEntries };
};

// One-time repair: fix issues where displayId prefix doesn't match the app field.
// e.g. a migraine-tracker issue with EC-131 should be MT-N.
export const repairMismatchedPrefixes = async (): Promise<{ fixed: number; log: string[] }> => {
    await requireAdmin();

    const issuesCol = collection(db, 'issues');
    const snap = await safeGetDocs(issuesCol, { fallback: [], context: 'Issues', description: 'Repair Mismatched Prefixes' });

    // Find docs where the displayId prefix doesn't match the app's expected prefix
    const mismatched: { ref: DocumentReference; app: string; currentId: string; expectedPrefix: string }[] = [];

    snap.docs.forEach(d => {
        const data = d.data();
        if (data.deleted) return;
        const appKey = data.app as AppKey | undefined;
        if (!appKey || !APP_KEYS.includes(appKey)) return;

        const expectedPrefix = getAppPrefix(appKey);
        const idStr = data.displayId || data.issueId || data.issue_id;
        if (!idStr || typeof idStr !== 'string') return;

        const match = idStr.match(/^([A-Z]+)-(\d+)$/);
        if (match && match[1] !== expectedPrefix) {
            mismatched.push({ ref: d.ref, app: appKey, currentId: idStr, expectedPrefix });
        }
    });

    if (mismatched.length === 0) {
        return { fixed: 0, log: ['No mismatched prefixes found.'] };
    }

    // For each prefix that needs fixing, get the current max and assign new sequential IDs
    const maxByPrefix = new Map<string, number>();
    for (const item of mismatched) {
        if (!maxByPrefix.has(item.expectedPrefix)) {
            maxByPrefix.set(item.expectedPrefix, await getMaxIssueNumber(item.expectedPrefix));
        }
    }

    const batch = writeBatch(db);
    const logEntries: string[] = [];

    for (const item of mismatched) {
        const max = maxByPrefix.get(item.expectedPrefix)!;
        const nextId = max + 1;
        maxByPrefix.set(item.expectedPrefix, nextId);
        const newId = `${item.expectedPrefix}-${nextId}`;
        batch.update(item.ref, { displayId: newId, issueId: newId, updatedAt: serverTimestamp() });
        logEntries.push(`${item.currentId} (${item.app}) → ${newId}`);
    }

    await batch.commit();
    return { fixed: mismatched.length, log: logEntries };
};


// --- Issue Category Registry ---
export const getIssueCategories = async (): Promise<IssueCategory[]> => {
    const catsCol = collection(db, 'issue_categories');
    const snap = await safeGetDocs(query(catsCol, orderBy('label', 'asc')), { fallback: [], context: 'Categories', description: 'Get Categories' });
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as IssueCategory));
};

export const subscribeToIssueCategories = (onData: (categories: IssueCategory[]) => void): (() => void) => {
    const catsCol = collection(db, 'issue_categories');
    return onSnapshot(query(catsCol, orderBy('label', 'asc')), (snapshot) => {
        const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IssueCategory));
        onData(categories);
    });
};

export const addIssueCategory = async (cat: Omit<IssueCategory, 'createdAt' | 'createdBy'>) => {
    await requireAdmin();
    const user = auth.currentUser;
    // Slugify the ID if not provided, or ensure the provided ID is safe
    const safeId = cat.id.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');

    // Check if exists
    const docRef = doc(db, 'issue_categories', safeId);
    const exists = (await safeGetDoc(docRef, { fallback: null, context: 'Categories', description: 'Check Category Exists' })).exists();
    if (exists) throw new Error("Category ID already exists");

    await setDoc(docRef, {
        ...cat,
        id: safeId,
        createdAt: serverTimestamp(),
        createdBy: user?.uid === 'system' ? 'system' : 'admin'
    });
};

export const updateIssueCategory = async (id: string, updates: Partial<IssueCategory>) => {
    await requireAdmin();
    // Prevent ID updates
    const { id: _unused, ...safeUpdates } = updates; // eslint-disable-line @typescript-eslint/no-unused-vars
    await updateDoc(doc(db, 'issue_categories', id), safeUpdates);
};

// --- Bulk Issue Import ---

export interface ImportIssueRow {
    title: string;
    severity: string;
    status?: string;
    category?: string;
    source?: string;
    summary?: string;
    notes?: string;
    app?: string;
    createdBy?: string;
}

let importInProgress = false;

export const batchImportIssues = async (rows: ImportIssueRow[]): Promise<number> => {
    await requireAdmin();

    if (importInProgress) {
        throw new Error('An import is already in progress. Please wait for it to complete.');
    }

    if (rows.length === 0) return 0;

    importInProgress = true;
    try {
        const VALID_STATUSES: Set<string> = new Set([
            'new', 'reviewed', 'backlogged', 'in_progress', 'resolved', 'released', 'closed',
        ]);
        const VALID_SEVERITIES: Set<string> = new Set(['S1', 'S2', 'S3', 'S4']);
        const validateStatus = (status?: string): string => {
            const normalized = normalizeIssueStatus(status);
            return VALID_STATUSES.has(normalized) ? normalized : 'new';
        };
        const validateSeverity = (sev?: string): string => {
            return sev && VALID_SEVERITIES.has(sev) ? sev : 'S3';
        };

        // Get the true max per prefix before writing, so imported issues get unique sequential IDs
        const maxByPrefix = new Map<string, number>();
        for (const row of rows) {
            const p = getAppPrefix((row.app || '') as AppKey);
            if (!maxByPrefix.has(p)) {
                maxByPrefix.set(p, await getMaxIssueNumber(p));
            }
        }

        const user = auth.currentUser;

        // Chunk into sub-batches of 400 to stay safely under Firestore's 500 operation limit
        const CHUNK_SIZE = 400;
        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
            const chunk = rows.slice(i, i + CHUNK_SIZE);
            const chunkBatch = writeBatch(db);

            chunk.forEach(row => {
                const ref = doc(collection(db, 'issues'));
                const rowPrefix = getAppPrefix((row.app || '') as AppKey);
                const nextId = (maxByPrefix.get(rowPrefix) || 0) + 1;
                maxByPrefix.set(rowPrefix, nextId);
                const displayId = `${rowPrefix}-${nextId}`;

                const issueDoc: Record<string, unknown> = {
                    description: (row.title || '').slice(0, 2000),
                    severity: validateSeverity(row.severity),
                    status: validateStatus(row.status),
                    type: row.category || '',
                    app: row.app || '',
                    userId: row.createdBy || user?.email || null,
                    message: row.summary || '',
                    displayId,
                    issueId: displayId,
                    url: null,
                    deleted: false,
                    timestamp: serverTimestamp(),
                    createdAt: serverTimestamp(),
                };

                if (row.source) {
                    issueDoc.source = row.source;
                }

                if (row.notes) {
                    issueDoc.notes = [{
                        text: row.notes,
                        adminUid: user?.uid || 'import',
                        createdAt: Timestamp.now(),
                    }];
                }

                chunkBatch.set(ref, issueDoc);
            });

            await chunkBatch.commit();
        }
        return rows.length;
    } finally {
        importInProgress = false;
    }
};

export const seedDefaultCategories = async () => {
    await requireAdmin();
    const defaults = [
        { id: 'auth_account_access', label: 'Authentication & Account Access', description: 'Issues related to login, signup, passwords, and sessions.' },
        { id: 'user_interface_ux', label: 'User Interface / UX', description: 'Visual bugs, layout issues, typos, and confusing interactions.' },
        { id: 'quiz_assessment_logic', label: 'Quiz & Assessment Logic', description: 'Problems with question/answer logic, scoring, or exam flows.' },
        { id: 'tutor_ai_output', label: 'Tutor / AI Output', description: 'Incorrect, hallucinated, or unhelpful AI responses.' },
        { id: 'performance_stability', label: 'Performance & Stability', description: 'Crashes, slow loading, timeouts, or network errors.' },
        { id: 'billing_subscription', label: 'Billing & Subscription', description: 'Payments, plan upgrades/downgrades, and receipt issues.' }
    ];

    const batch = writeBatch(db);
    let count = 0;

    for (const def of defaults) {
        const docRef = doc(db, 'issue_categories', def.id);
        const snap = await safeGetDoc(docRef, { fallback: null, context: 'Categories', description: `Check default category ${def.id}` });

        if (!snap.exists()) {
            batch.set(docRef, {
                ...def,
                status: 'active',
                createdAt: serverTimestamp(),
                createdBy: 'system'
            });
            count++;
        }
    }

    if (count > 0) {
        await batch.commit();
    }
    return count;
};

// --- Release Version Registry ---

const VERSION_REGEX = /^\d+\.\d{1,2}\.\d+$/;

// Legacy versions without appId are treated as 'exam-coach'; normalize legacy values (e.g. "migraine tracker" → "migraine-tracker")
const resolveVersionAppId = (v: ReleaseVersion): string => normalizeAppValue(v.appId || 'exam-coach');

export const getReleaseVersions = async (appId?: string): Promise<ReleaseVersion[]> => {
    const col = collection(db, 'release_versions');
    const constraints: QueryConstraint[] = [orderBy('version', 'desc')];
    // 'all' = return all versions unfiltered
    if (appId === 'all') {
        const q = query(col, ...constraints);
        const snap = await safeGetDocs(q, { fallback: [], context: 'Versions', description: 'Get All Release Versions' });
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as ReleaseVersion));
    }
    // Server-side filter when appId is provided. Legacy docs (no appId) default to 'exam-coach',
    // so we can only use a Firestore where() for non-exam-coach apps. For exam-coach (or no appId),
    // we fall back to client-side filtering to capture legacy docs that lack the appId field.
    const norm = appId ? normalizeAppValue(appId) : undefined;
    const useServerFilter = norm && norm !== 'exam-coach';
    if (useServerFilter) { constraints.push(where('appId', '==', norm)); }
    const q = query(col, ...constraints);
    const snap = await safeGetDocs(q, { fallback: [], context: 'Versions', description: 'Get Release Versions' });
    let versions = snap.docs.map(d => ({ id: d.id, ...d.data() } as ReleaseVersion));
    // Client-side filter for exam-coach (catches legacy docs without appId field)
    if (norm && !useServerFilter) { versions = versions.filter(v => resolveVersionAppId(v) === norm); }
    return versions;
};

export const subscribeToReleaseVersions = (onData: (versions: ReleaseVersion[]) => void, appId?: string): (() => void) => {
    const col = collection(db, 'release_versions');
    const constraints: QueryConstraint[] = [orderBy('version', 'desc')];
    // 'all' = subscribe to all versions unfiltered
    if (appId === 'all') {
        return onSnapshot(query(col, ...constraints), (snapshot) => {
            onData(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ReleaseVersion)));
        }, (error) => {
            console.error("Release versions subscription error:", error);
        });
    }
    const norm = appId ? normalizeAppValue(appId) : undefined;
    const useServerFilter = norm && norm !== 'exam-coach';
    if (useServerFilter) { constraints.push(where('appId', '==', norm)); }
    return onSnapshot(query(col, ...constraints), (snapshot) => {
        let versions = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ReleaseVersion));
        if (norm && !useServerFilter) { versions = versions.filter(v => resolveVersionAppId(v) === norm); }
        onData(versions);
    }, (error) => {
        console.error("Release versions subscription error:", error);
    });
};

export const addReleaseVersion = async (version: string, rawAppId: string) => {
    await requireAdmin();
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");
    const appId = normalizeAppValue(rawAppId);

    if (!VERSION_REGEX.test(version)) {
        throw new Error("Invalid version format. Use x.x.x or x.xx.x format (e.g. 1.5.1 or 1.15.1)");
    }

    // Use appId-prefixed doc ID to allow same version across apps
    const docId = `${appId}__${version}`;
    const docRef = doc(db, 'release_versions', docId);
    const exists = (await safeGetDoc(docRef, { fallback: null, context: 'Versions', description: `Check version ${version} exists` })).exists();
    if (exists) throw new Error(`Version ${version} already exists for this app`);

    await setDoc(docRef, {
        version,
        appId,
        status: 'planned',
        createdAt: serverTimestamp(),
        createdBy: user.uid,
    });

    await logGlobalAdminAction('ADD_RELEASE_VERSION', docId, { version, appId });
};

export const updateReleaseVersionStatus = async (versionId: string, status: ReleaseVersionStatus) => {
    await requireAdmin();
    await updateDoc(doc(db, 'release_versions', versionId), { status });
    await logGlobalAdminAction('UPDATE_VERSION_STATUS', versionId, { status });
};

export const deleteReleaseVersion = async (versionId: string) => {
    await requireAdmin();
    await deleteDoc(doc(db, 'release_versions', versionId));
    await logGlobalAdminAction('DELETE_RELEASE_VERSION', versionId, {});
};

// --- PFV (Planned for Version) on Issues ---

export const updateIssuePFV = async (issueId: string, prevPFV: string | null, newPFV: string | null) => {
    await requireAdmin();

    // Validate newPFV exists in release_versions (or is null to clear)
    if (newPFV) {
        const col = collection(db, 'release_versions');
        const q = query(col, where('version', '==', newPFV));
        const snap = await safeGetDocs(q, { fallback: [], context: 'PFV/RIV Validation', description: `Validate version ${newPFV}` });
        if (snap.empty) {
            throw new Error(`Version ${newPFV} does not exist in release_versions`);
        }
    }

    await updateDoc(doc(db, 'issues', issueId), {
        plannedForVersion: newPFV,
        updatedAt: serverTimestamp(),
    });

    await logGlobalAdminAction('UPDATE_PFV', issueId, { prevPFV, newPFV });
};

// --- RIV (Released In Version) on Issues ---

export const updateIssueRIV = async (issueId: string, oldValue: string | null, newValue: string | null) => {
    await requireAdmin();

    // Validate newValue exists in release_versions (or null to clear)
    if (newValue) {
        const col = collection(db, 'release_versions');
        const q = query(col, where('version', '==', newValue));
        const snap = await safeGetDocs(q, { fallback: [], context: 'RIV Validation', description: `Validate version ${newValue}` });
        if (snap.empty) {
            throw new Error(`Version ${newValue} does not exist in release_versions`);
        }
    }

    await updateDoc(doc(db, 'issues', issueId), {
        releasedInVersion: newValue,
        updatedAt: serverTimestamp(),
    });

    const editedBy = auth.currentUser?.uid || 'unknown';
    await logGlobalAdminAction('RIV_EDIT', issueId, { oldValue, newValue, editedBy });
};

// --- Issues by PFV ---
export const getIssuesByPFV = async (version: string): Promise<ReportedIssue[]> => {
    const issuesCol = collection(db, 'issues');
    const q = query(issuesCol, where('plannedForVersion', '==', version));
    const snap = await safeGetDocs(q, { fallback: [], context: 'Issues', description: `Issues for PFV ${version}` });
    return snap.docs
        .map(d => ({ id: d.id, ...d.data() } as ReportedIssue))
        .filter(i => !i.deleted);
};
