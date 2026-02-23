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

    rows.push({
      ecNumber: displayId || '',
      firestoreId: doc.id,
      summary: d.description || d.message || '',
      severity: d.severity || '',
      classification: d.classification || '',
      status: d.status || '',
      pfv: d.plannedForVersion || 'null',
      app: d.app || 'ExamCoach',
      createdAt: toISO(ts),
      lastUpdated: toISO(d.updatedAt)
    });
  });

  // Sort by EC numeric ID
  rows.sort((a, b) => {
    const numA = parseInt((a.ecNumber.match(/\d+/) || ['0'])[0]);
    const numB = parseInt((b.ecNumber.match(/\d+/) || ['0'])[0]);
    return numA - numB;
  });

  const header = 'EC Number,Firestore ID,Summary,Severity,Classification,Status,Planned For Version,App,Created At,Last Updated';
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
      csvEscape(r.lastUpdated)
    ].join(','));
  });

  console.error(`\n[OK] Exported ${rows.length} ExamCoach issues.`);
  process.exit(0);
})();
