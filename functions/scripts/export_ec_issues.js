/**
 * Export all ExamCoach issues as CSV.
 * Uses firebase-admin with Application Default Credentials (gcloud auth).
 *
 * Usage:
 *   cd functions
 *   node scripts/export_ec_issues.js
 */

const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'exam-coach-ai-platform' });
const db = admin.firestore();

function toISO(field) {
  if (!field) return '';
  if (field.toDate) return field.toDate().toISOString();
  if (field._seconds != null) return new Date(field._seconds * 1000).toISOString();
  return '';
}

function csvEscape(val) {
  const s = String(val || '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const SEVERITY_WEIGHT = { S1: 40, S2: 25, S3: 10, S4: 5 };
const STATUS_MOD = { new: 15, backlogged: 10, in_progress: -5, reviewed: -2, released: -50, closed: -100, fixed: -100 };

function parseVersion(v) {
  if (!v || v === 'null') return null;
  return v.split('.').map(n => parseInt(n) || 0);
}

function compareVersions(a, b) {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function computeTriageScore(severity, status, ageDays, isStale) {
  const sevW = severity === 'S1' ? 100 : (SEVERITY_WEIGHT[severity] || 10);
  const statM = STATUS_MOD[status] || 0;
  const age = typeof ageDays === 'number' ? Math.min(ageDays, 30) : 0;
  return sevW + age + statM + (isStale ? 10 : 0);
}

(async () => {
  const snap = await db.collection('issues').get();
  const rows = [];

  snap.forEach(doc => {
    const d = doc.data();
    const appRaw = (d.app || '').toLowerCase().replace(/\s+/g, '');
    // Exclude Admin Core issues only
    if (appRaw === 'admincore' || appRaw === 'admin-core') return;

    const displayId = d.displayId || d.issueId || d.issue_id || (doc.id.startsWith('EC-') ? doc.id : '');
    const ts = d.timestamp || d.createdAt;
    const createdISO = toISO(ts);
    const updatedISO = toISO(d.updatedAt);
    const now = Date.now();
    const STALE_MS = 14 * 86400000;
    const createdMs = createdISO ? new Date(createdISO).getTime() : null;
    const updatedMs = updatedISO ? new Date(updatedISO).getTime() : null;
    const ageDays = createdMs != null ? Math.floor((now - createdMs) / 86400000) : '';
    const isStale = updatedMs != null ? (now - updatedMs) > STALE_MS : false;

    const sev = d.severity || '';
    const stat = d.status || '';
    const triageScore = computeTriageScore(sev, stat, ageDays, isStale);

    rows.push({
      ecNumber: displayId || '',
      firestoreId: doc.id,
      summary: d.description || d.message || '',
      severity: sev,
      classification: d.classification || '',
      status: stat,
      pfv: d.plannedForVersion || 'null',
      app: d.app || 'ExamCoach',
      createdAt: createdISO,
      lastUpdated: updatedISO,
      ageDays,
      isStale,
      triageScore
    });
  });

  // Sort: null PFV first, then PFVs ascending; within group triageScore DESC, ageDays DESC
  rows.sort((a, b) => {
    const va = parseVersion(a.pfv);
    const vb = parseVersion(b.pfv);
    const aIsNull = va === null;
    const bIsNull = vb === null;

    // Null PFV goes first
    if (aIsNull !== bIsNull) return aIsNull ? -1 : 1;

    // Both have PFV — ascending
    if (!aIsNull && !bIsNull) {
      const vCmp = compareVersions(va, vb);
      if (vCmp !== 0) return vCmp;
    }

    // Within same PFV group: triageScore DESC
    if (b.triageScore !== a.triageScore) return b.triageScore - a.triageScore;

    // Within equal score: ageDays DESC
    const ageA = typeof a.ageDays === 'number' ? a.ageDays : -1;
    const ageB = typeof b.ageDays === 'number' ? b.ageDays : -1;
    return ageB - ageA;
  });

  const header = 'EC Number,Firestore ID,Summary,Severity,Classification,Status,Planned For Version,App,Created At,Last Updated,Age (Days),Is Stale (14d+),Triage Score';
  console.log(header);
  rows.forEach(r => {
    console.log([
      csvEscape(r.ecNumber),
      csvEscape(r.firestoreId),
      csvEscape(r.summary),
      csvEscape(r.severity),
      csvEscape(r.classification),
      csvEscape(r.status),
      csvEscape(r.pfv),
      csvEscape(r.app),
      csvEscape(r.createdAt),
      csvEscape(r.lastUpdated),
      csvEscape(r.ageDays),
      csvEscape(r.isStale),
      csvEscape(r.triageScore)
    ].join(','));
  });

  console.error(`\n[OK] Exported ${rows.length} ExamCoach issues.`);
  process.exit(0);
})();
