import React, { useEffect, useState } from 'react';
import { collection, limit, query } from 'firebase/firestore';
import { db } from '../firebase';
import { safeGetDocs } from '../utils/firestoreSafe';
import { AlertTriangle, CheckCircle, Database, XCircle } from 'lucide-react';

interface CheckResult {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    details?: string;
}

const DataIntegrityPanel: React.FC = () => {
    const [results, setResults] = useState<CheckResult[]>([]);
    const [loading, setLoading] = useState(true);

    const checkIntegrity = async () => {
        setLoading(true);
        const checks: CheckResult[] = [];

        // 1. Check Users Collection
        const usersQ = query(collection(db, 'users'), limit(5));
        const usersSnap = await safeGetDocs(usersQ, { fallback: [], context: 'Integrity', description: 'Check Users' });

        if (usersSnap.empty) {
            checks.push({ name: 'Users Collection', status: 'warn', message: 'No users found', details: 'Collection might be empty or missing.' });
        } else {
            let validSchema = true;
            usersSnap.docs.forEach((doc: any) => {
                const data = doc.data();
                if (!data.email || !data.uid) validSchema = false;
            });
            if (validSchema) {
                checks.push({ name: 'Users Schema', status: 'pass', message: 'Users look healthy' });
            } else {
                checks.push({ name: 'Users Schema', status: 'warn', message: 'Missing fields', details: 'Some users missing email or uid.' });
            }
        }

        // 2. Check Apps
        const appsQ = query(collection(db, 'apps'), limit(1));
        const appsSnap = await safeGetDocs(appsQ, { fallback: [], context: 'Integrity', description: 'Check Apps' });
        if (appsSnap.empty) {
            checks.push({ name: 'Apps Config', status: 'fail', message: 'No Apps Found', details: 'Critical: Apps collection is empty.' });
        } else {
            checks.push({ name: 'Apps Config', status: 'pass', message: 'Apps configuration found' });
        }

        // 3. Check Decisions (2112)
        const decisionsQ = query(collection(db, 'decisions'), limit(1));
        const decisionsSnap = await safeGetDocs(decisionsQ, { fallback: [], context: 'Integrity', description: 'Check Decisions' });
        if (decisionsSnap.empty) {
            checks.push({ name: '2112 Decisions', status: 'warn', message: 'No decisions yet', details: 'Normal if new environment.' });
        } else {
            checks.push({ name: '2112 Decisions', status: 'pass', message: 'Decisions collection active' });
        }

        // 4. Check Simulations
        const simQ = query(collection(db, 'simulations'), limit(1));
        const simSnap = await safeGetDocs(simQ, { fallback: [], context: 'Integrity', description: 'Check Simulations' });
        if (simSnap.empty) {
            checks.push({ name: '2112 Simulations', status: 'pass', message: 'No simulations (Clean)', details: 'Simulations collection is clean.' });
        } else {
            checks.push({ name: 'Simulations', status: 'pass', message: 'Simulations active' });
        }

        setResults(checks);
        setLoading(false);
    };

    useEffect(() => {
        checkIntegrity();
    }, []);

    if (loading) return <div className="p-4 text-slate-400 text-sm animate-pulse">Running system integrity checks...</div>;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-500" />
                    <h2 className="font-semibold text-slate-800 dark:text-slate-100">Data Integrity</h2>
                </div>
                <button onClick={checkIntegrity} className="text-xs text-indigo-500 hover:text-indigo-400">Re-run</button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {results.map((check, idx) => (
                    <div key={idx} className="px-6 py-3 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            {check.status === 'pass' && <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />}
                            {check.status === 'warn' && <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />}
                            {check.status === 'fail' && <XCircle className="w-4 h-4 text-rose-500 mt-0.5" />}
                            <div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{check.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{check.message}</p>
                            </div>
                        </div>
                        {check.details && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-full">{check.details}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DataIntegrityPanel;
