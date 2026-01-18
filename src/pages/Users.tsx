import React, { useState, useEffect } from 'react';
import {
    searchUsers,
    getTesterSummaryStats,
    getTesterUsers,
    grantTesterAccess,
    revokeTesterAccess,
    fixTesterAccess
} from '../services/firestoreService';
import { getEffectiveAccess } from '../utils/effectiveAccess';
import type { User, TesterStats } from '../types';
import {
    getFunctions,
    httpsCallable
} from 'firebase/functions';
import {
    Search,
    User as UserIcon,
    CheckCircle2,
    AlertTriangle,
    Zap,
    FlaskConical,
    Clock,
    Filter,
    Trash2,
    Wrench, // For Fix
    Ban,
    X,
    Loader2,
    MoreVertical
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const UsersPage: React.FC = () => {
    // State
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<TesterStats>({ activeTesters: 0, expiringSoon: 0, totalGranted30d: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const [showTestersOnly, setShowTestersOnly] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Actions State
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{
        type: 'GRANT' | 'REVOKE' | 'FIX' | 'DELETE';
        user: User;
        isOpen: boolean;
    } | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const functions = getFunctions();

    // Initial Load
    useEffect(() => {
        fetchUsers();
        fetchStats();
    }, [searchTerm, showTestersOnly]);

    const fetchStats = async () => {
        const s = await getTesterSummaryStats();
        setStats(s);
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            let data: User[];
            if (showTestersOnly) {
                const allTesters = await getTesterUsers();
                if (searchTerm) {
                    const lower = searchTerm.toLowerCase();
                    data = allTesters.filter(u => u.email.toLowerCase().includes(lower));
                } else {
                    data = allTesters;
                }
            } else {
                data = await searchUsers(searchTerm);
            }
            setUsers(data);
        } catch (err) {
            console.error("Fetch users error:", err);
        } finally {
            setLoading(false);
        }
    };

    // Generic Action Handler
    const handleAction = async (action: () => Promise<void>, successText: string) => {
        setActionLoading(true);
        setMessage(null);
        try {
            await action();
            setMessage({ type: 'success', text: successText });
            fetchUsers();
            fetchStats();
            setConfirmAction(null);
            if (selectedUser) setSelectedUser(null);
        } catch (err: any) {
            console.error("Action failed:", err);
            setMessage({ type: 'error', text: err.message || "Action failed" });
        } finally {
            setActionLoading(false);
        }
    };

    const confirmModal = confirmAction && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                        {confirmAction.type === 'GRANT' && <Zap className="w-8 h-8 text-purple-400" />}
                        {confirmAction.type === 'REVOKE' && <Ban className="w-8 h-8 text-amber-400" />}
                        {confirmAction.type === 'FIX' && <Wrench className="w-8 h-8 text-blue-400" />}
                        {confirmAction.type === 'DELETE' && <Trash2 className="w-8 h-8 text-red-500" />}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                        {confirmAction.type === 'GRANT' && 'Grant Tester Access?'}
                        {confirmAction.type === 'REVOKE' && 'Revoke Tester Access?'}
                        {confirmAction.type === 'FIX' && 'Fix Tester Access?'}
                        {confirmAction.type === 'DELETE' && 'Disable User?'}
                    </h3>
                    <p className="text-slate-400 text-sm">
                        {confirmAction.type === 'GRANT' && `Grants ${confirmAction.user.email} Pro access for 14 days. This will clear any active trials.`}
                        {confirmAction.type === 'REVOKE' && `Removes Pro access from ${confirmAction.user.email} immediately.`}
                        {confirmAction.type === 'FIX' && `Resets ${confirmAction.user.email} access to valid Tester Pro (14 days).`}
                        {confirmAction.type === 'DELETE' && `Are you sure you want to disable ${confirmAction.user.email}?`}
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setConfirmAction(null)}
                        className="flex-1 px-4 py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-all border border-slate-700"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={actionLoading}
                        onClick={() => {
                            const uid = confirmAction.user.uid;
                            if (confirmAction.type === 'GRANT') {
                                handleAction(() => grantTesterAccess(uid), "Tester access granted");
                            } else if (confirmAction.type === 'REVOKE') {
                                handleAction(() => revokeTesterAccess(uid), "Tester access revoked");
                            } else if (confirmAction.type === 'FIX') {
                                handleAction(() => fixTesterAccess(uid), "Tester access fixed");
                            } else if (confirmAction.type === 'DELETE') {
                                // Mapped to disableUser as per existing implementation "Delete" = "Disable"
                                const callable = httpsCallable(functions, 'disableUser');
                                handleAction(async () => { await callable({ targetUid: uid, disabled: true }); }, "User disabled");
                            }
                        }}
                        className={cn(
                            "flex-1 px-4 py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2",
                            confirmAction.type === 'DELETE' ? "bg-red-600 hover:bg-red-500" :
                                confirmAction.type === 'REVOKE' ? "bg-amber-600 hover:bg-amber-500" :
                                    "bg-purple-600 hover:bg-purple-500"
                        )}
                    >
                        {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Users</h1>
                    <p className="text-slate-400">Manage platform members and their permissions</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setShowTestersOnly(!showTestersOnly)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all font-medium whitespace-nowrap",
                            showTestersOnly
                                ? "bg-purple-500/10 border-purple-500/50 text-purple-400"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        )}
                    >
                        {showTestersOnly ? <FlaskConical className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                        {showTestersOnly ? "Testers Only" : "All Users"}
                    </button>
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search user..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-3xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                        <FlaskConical className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Active Testers</p>
                        <p className="text-2xl font-bold text-white">{stats.activeTesters}</p>
                    </div>
                </div>
                {/* Add more stats if needed, reusing structure */}
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-3xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Expiring Soon</p>
                        <p className="text-2xl font-bold text-white">{stats.expiringSoon}</p>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-3xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Granted (30d)</p>
                        <p className="text-2xl font-bold text-white">{stats.totalGranted30d}</p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800/50 border-b border-slate-800">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">User</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Plan</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Access</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Joined</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : users.length > 0 ? users.map((u) => {
                                const access = getEffectiveAccess(u);
                                return (
                                    <tr key={u.uid} className="hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 border border-slate-700">
                                                    <UserIcon className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0 pointer-events-none">
                                                    {/* Use pointer-events-none to click row? No, onClick row is handled differently */}
                                                    <p className="text-sm font-bold text-white truncate max-w-[150px]">{u.email}</p>
                                                    <p className="text-[10px] text-slate-500 font-mono truncate max-w-[80px]">{u.uid}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border",
                                                    u.plan === 'pro'
                                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                        : "bg-slate-800 text-slate-400 border-slate-700"
                                                )}>
                                                    {u.plan === 'pro' ? 'Pro' : 'Starter'}
                                                </span>
                                                {u.testerOverride && (
                                                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                                                        <FlaskConical className="w-3 h-3" />
                                                        Tester
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className={cn(
                                                    "text-xs font-bold",
                                                    access.type === 'tester' ? "text-purple-400" :
                                                        access.type === 'tester_invalid' ? "text-red-400" :
                                                            access.type === 'paid' ? "text-emerald-400" :
                                                                access.type === 'trial' ? "text-amber-400" :
                                                                    "text-slate-500"
                                                )}>
                                                    {access.label}
                                                </span>
                                                {access.endsAt && (
                                                    <span className="text-[10px] text-slate-500 font-mono">
                                                        Ends: {access.endsAt.toDate().toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">
                                            {u.createdAt?.toDate().toLocaleDateString() || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.disabled ?
                                                <span className="text-red-500 text-xs font-bold uppercase">Disabled</span> :
                                                <span className="text-emerald-500 text-xs font-bold uppercase">Active</span>
                                            }
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1">
                                                {/* Tester Actions */}
                                                {access.type === 'tester_invalid' && (
                                                    <button
                                                        onClick={() => setConfirmAction({ type: 'FIX', user: u, isOpen: true })}
                                                        className="p-2 hover:bg-slate-800 rounded-lg text-blue-400 transition-colors"
                                                        title="Fix Tester Access"
                                                    >
                                                        <Wrench className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {u.testerOverride ? (
                                                    <button
                                                        onClick={() => setConfirmAction({ type: 'REVOKE', user: u, isOpen: true })}
                                                        className="p-2 hover:bg-slate-800 rounded-lg text-amber-500 transition-colors"
                                                        title="Revoke Tester Access"
                                                    >
                                                        <Ban className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmAction({ type: 'GRANT', user: u, isOpen: true })}
                                                        className="p-2 hover:bg-slate-800 rounded-lg text-purple-400 transition-colors"
                                                        title="Grant Tester Access"
                                                    >
                                                        <Zap className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {/* Delete/Disable */}
                                                <button
                                                    onClick={() => setConfirmAction({ type: 'DELETE', user: u, isOpen: true })}
                                                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-red-500 transition-colors"
                                                    title="Disable User"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                {/* Side Panel Toggle */}
                                                <button
                                                    onClick={() => setSelectedUser(u)}
                                                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Side Panel (kept for details but actions moved to table mainly, can keep actions here too for complete access) */}
            {selectedUser && (
                <>
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        onClick={() => setSelectedUser(null)}
                    />
                    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 border-l border-slate-800 z-50 shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">User Details</h2>
                            <button onClick={() => setSelectedUser(null)}>
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-8 space-y-8 overflow-y-auto flex-1">
                            <div className="text-center">
                                <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center text-slate-500 border-2 border-slate-700 mx-auto mb-4">
                                    <UserIcon className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-bold text-white truncate">{selectedUser.email}</h3>
                                <p className="text-slate-500 text-sm font-mono mt-1">{selectedUser.uid}</p>
                            </div>
                            {/* Debug Info */}
                            <div className="bg-slate-800 p-4 rounded-xl font-mono text-xs text-slate-400 overflow-x-auto">
                                <pre>{JSON.stringify(getEffectiveAccess(selectedUser), null, 2)}</pre>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {confirmModal}

            {/* Message Toast */}
            {message && (
                <div className={cn(
                    "fixed bottom-8 right-8 p-4 rounded-2xl border text-sm flex items-center gap-3 z-[70] animate-in slide-in-from-bottom-4",
                    message.type === 'success'
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                        : "bg-red-500/10 border-red-500/20 text-red-200"
                )}>
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    {message.text}
                </div>
            )}
        </div>
    );
};

export default UsersPage;
