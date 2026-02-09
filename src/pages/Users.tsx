import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
    searchUsers,
    getTesterSummaryStats,
    getTesterUsers,
    grantTesterAccess,
    revokeTesterAccess,
    fixTesterAccess,
    startTrial,
    extendTrial,
    cancelTrial,
    archiveUser,
    restoreUser,
    grantFreshTrial,
    updateUserProfile,
    adminUpdateEmail
} from '../services/firestoreService';
import { getEffectiveAccess } from '../utils/effectiveAccess';
import type { User, TesterStats } from '../types';
import { APP_OPTIONS } from '../constants';
import type { AppKey } from '../constants';
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
    MoreVertical,
    Download,
    Play,
    TimerReset,
    XCircle,
    Archive,
    ArchiveRestore,
    RefreshCw,
    Pencil,
    Copy
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
    const [showArchived, setShowArchived] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Actions State
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{
        type: 'GRANT' | 'REVOKE' | 'FIX' | 'DELETE' | 'START_TRIAL' | 'EXTEND_TRIAL' | 'CANCEL_TRIAL' | 'ARCHIVE' | 'RESTORE' | 'GRANT_FRESH_TRIAL';
        user: User;
        isOpen: boolean;
    } | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [trialAppId, setTrialAppId] = useState<AppKey>('exam-coach');

    // Edit Modal State
    const [editUser, setEditUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState({ firstName: '', lastName: '', displayName: '', email: '' });
    const [emailConfirmOpen, setEmailConfirmOpen] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);

    const functions = getFunctions();
    const { isAdmin, loading: authLoading } = useAuth();

    // Initial Load
    useEffect(() => {
        if (!authLoading && isAdmin) {
            fetchUsers();
            fetchStats();
        }
    }, [searchTerm, showTestersOnly, showArchived, authLoading, isAdmin]);

    const fetchStats = async () => {
        if (!isAdmin) return;
        const s = await getTesterSummaryStats();
        setStats(s);
    };

    const fetchUsers = async () => {
        if (!isAdmin) return;
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
            // Client-side archive filter (avoids Firestore composite index requirement)
            const filtered = showArchived
                ? data.filter(u => u.archived === true)
                : data.filter(u => u.archived !== true);
            setUsers(filtered);
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

    const exportUsersToCSV = () => {
        if (!users || users.length === 0) return;
        const headers = Object.keys(users[0]);
        const rows = users.map(user =>
            headers.map(h => JSON.stringify(user[h] ?? "")).join(",")
        );
        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const openEditModal = (user: User) => {
        setEditForm({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            displayName: user.displayName || '',
            email: user.email || '',
        });
        setEditUser(user);
        setEmailConfirmOpen(false);
    };

    const handleEditSave = async () => {
        if (!editUser) return;

        const emailChanged = editForm.email.trim() !== (editUser.email || '');
        if (emailChanged && !emailConfirmOpen) {
            setEmailConfirmOpen(true);
            return;
        }

        setSaveLoading(true);
        setMessage(null);
        try {
            // Profile fields
            const profileUpdates: { firstName?: string; lastName?: string; displayName?: string } = {};
            if (editForm.firstName.trim() !== (editUser.firstName || '')) profileUpdates.firstName = editForm.firstName.trim();
            if (editForm.lastName.trim() !== (editUser.lastName || '')) profileUpdates.lastName = editForm.lastName.trim();
            if (editForm.displayName.trim() !== (editUser.displayName || '')) profileUpdates.displayName = editForm.displayName.trim();

            if (Object.keys(profileUpdates).length > 0) {
                await updateUserProfile(editUser.uid, profileUpdates);
            }

            // Email change
            if (emailChanged) {
                await adminUpdateEmail(editUser.uid, editForm.email.trim());
            }

            const changedCount = Object.keys(profileUpdates).length + (emailChanged ? 1 : 0);
            if (changedCount > 0) {
                setMessage({ type: 'success', text: `Updated ${changedCount} field${changedCount > 1 ? 's' : ''}` });
                fetchUsers();
            }
            setEditUser(null);
            setEmailConfirmOpen(false);
        } catch (err: any) {
            console.error("Edit save failed:", err);
            setMessage({ type: 'error', text: err.message || "Save failed" });
        } finally {
            setSaveLoading(false);
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
                        {confirmAction.type === 'START_TRIAL' && <Play className="w-8 h-8 text-emerald-400" />}
                        {confirmAction.type === 'EXTEND_TRIAL' && <TimerReset className="w-8 h-8 text-amber-400" />}
                        {confirmAction.type === 'CANCEL_TRIAL' && <XCircle className="w-8 h-8 text-red-500" />}
                        {confirmAction.type === 'ARCHIVE' && <Archive className="w-8 h-8 text-slate-400" />}
                        {confirmAction.type === 'RESTORE' && <ArchiveRestore className="w-8 h-8 text-emerald-400" />}
                        {confirmAction.type === 'GRANT_FRESH_TRIAL' && <RefreshCw className="w-8 h-8 text-blue-400" />}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                        {confirmAction.type === 'GRANT' && 'Grant Tester Access?'}
                        {confirmAction.type === 'REVOKE' && 'Revoke Tester Access?'}
                        {confirmAction.type === 'FIX' && 'Fix Tester Access?'}
                        {confirmAction.type === 'DELETE' && 'Disable User?'}
                        {confirmAction.type === 'START_TRIAL' && 'Start 14-Day Trial?'}
                        {confirmAction.type === 'EXTEND_TRIAL' && 'Extend Trial 14 Days?'}
                        {confirmAction.type === 'CANCEL_TRIAL' && 'Cancel Trial?'}
                        {confirmAction.type === 'ARCHIVE' && 'Archive User?'}
                        {confirmAction.type === 'RESTORE' && 'Restore User?'}
                        {confirmAction.type === 'GRANT_FRESH_TRIAL' && 'Grant New 14-Day Trial?'}
                    </h3>
                    <p className="text-slate-400 text-sm">
                        {confirmAction.type === 'GRANT' && `Grants ${confirmAction.user.email} Pro access for 14 days. This will clear any active trials.`}
                        {confirmAction.type === 'REVOKE' && `Removes Pro access from ${confirmAction.user.email} immediately.`}
                        {confirmAction.type === 'FIX' && `Resets ${confirmAction.user.email} access to valid Tester Pro (14 days).`}
                        {confirmAction.type === 'DELETE' && `Are you sure you want to disable ${confirmAction.user.email}?`}
                        {confirmAction.type === 'START_TRIAL' && `Starts a 14-day Pro trial for ${confirmAction.user.email}.`}
                        {confirmAction.type === 'EXTEND_TRIAL' && `Extends ${confirmAction.user.email}'s trial by 14 days from current end date.`}
                        {confirmAction.type === 'CANCEL_TRIAL' && `Immediately cancels the active trial for ${confirmAction.user.email}. User will lose Pro access.`}
                        {confirmAction.type === 'ARCHIVE' && `Archives ${confirmAction.user.email}. User will be hidden from the default list but their access is unchanged. This is reversible.`}
                        {confirmAction.type === 'RESTORE' && `Restores ${confirmAction.user.email} to the active users list. Access remains unchanged.`}
                        {confirmAction.type === 'GRANT_FRESH_TRIAL' && (
                            <>
                                This will reset the user's trial period to 14 days starting now. This action takes effect immediately.
                                <select
                                    value={trialAppId}
                                    onChange={(e) => setTrialAppId(e.target.value as AppKey)}
                                    className="mt-3 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                                >
                                    {APP_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </>
                        )}
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
                            } else if (confirmAction.type === 'START_TRIAL') {
                                handleAction(() => startTrial(uid), "14-day trial started");
                            } else if (confirmAction.type === 'EXTEND_TRIAL') {
                                handleAction(() => extendTrial(uid), "Trial extended by 14 days");
                            } else if (confirmAction.type === 'CANCEL_TRIAL') {
                                handleAction(() => cancelTrial(uid), "Trial cancelled");
                            } else if (confirmAction.type === 'ARCHIVE') {
                                handleAction(() => archiveUser(uid), "User archived");
                            } else if (confirmAction.type === 'RESTORE') {
                                handleAction(() => restoreUser(uid), "User restored");
                            } else if (confirmAction.type === 'GRANT_FRESH_TRIAL') {
                                const expiresDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString();
                                handleAction(() => grantFreshTrial(uid, trialAppId), `Trial reset. New expiration: ${expiresDate}`);
                            }
                        }}
                        className={cn(
                            "flex-1 px-4 py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2",
                            (confirmAction.type === 'DELETE' || confirmAction.type === 'CANCEL_TRIAL') ? "bg-red-600 hover:bg-red-500" :
                                (confirmAction.type === 'REVOKE' || confirmAction.type === 'EXTEND_TRIAL') ? "bg-amber-600 hover:bg-amber-500" :
                                    (confirmAction.type === 'START_TRIAL' || confirmAction.type === 'RESTORE') ? "bg-emerald-600 hover:bg-emerald-500" :
                                        confirmAction.type === 'ARCHIVE' ? "bg-slate-600 hover:bg-slate-500" :
                                        confirmAction.type === 'GRANT_FRESH_TRIAL' ? "bg-blue-600 hover:bg-blue-500" :
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
                        onClick={exportUsersToCSV}
                        disabled={users.length === 0}
                        className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Export visible users as CSV"
                    >
                        <Download className="w-4 h-4" />
                        Export users (CSV)
                    </button>
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all font-medium whitespace-nowrap",
                            showArchived
                                ? "bg-slate-500/10 border-slate-500/50 text-slate-300"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        )}
                    >
                        {showArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                        {showArchived ? "Viewing Archived" : "Viewing Active"}
                    </button>
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
                                    <tr key={u.uid} className={cn("hover:bg-slate-800/30 transition-colors group", u.archived && "opacity-50")}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 border border-slate-700">
                                                    <UserIcon className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-white truncate max-w-[200px]">
                                                        {u.firstName || u.lastName
                                                            ? `${u.firstName || ''} ${u.lastName || ''}`.trim()
                                                            : u.displayName || u.email}
                                                    </p>
                                                    <p className="text-xs text-slate-400 truncate max-w-[200px]">{u.email}</p>
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
                                            <div className="flex flex-col gap-0.5">
                                                {u.disabled ?
                                                    <span className="text-red-500 text-xs font-bold uppercase">Disabled</span> :
                                                    <span className="text-emerald-500 text-xs font-bold uppercase">Active</span>
                                                }
                                                {u.archived && (
                                                    <span className="text-slate-500 text-[10px] font-bold uppercase">Archived</span>
                                                )}
                                            </div>
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

                                                {/* Trial Actions */}
                                                {access.type === 'none' && (
                                                    <button
                                                        onClick={() => setConfirmAction({ type: 'START_TRIAL', user: u, isOpen: true })}
                                                        className="p-2 hover:bg-slate-800 rounded-lg text-emerald-400 transition-colors"
                                                        title="Start 14-Day Trial"
                                                    >
                                                        <Play className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {access.type === 'trial' && (
                                                    <>
                                                        <button
                                                            onClick={() => setConfirmAction({ type: 'EXTEND_TRIAL', user: u, isOpen: true })}
                                                            className="p-2 hover:bg-slate-800 rounded-lg text-amber-400 transition-colors"
                                                            title="Extend 14 Days"
                                                        >
                                                            <TimerReset className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmAction({ type: 'CANCEL_TRIAL', user: u, isOpen: true })}
                                                            className="p-2 hover:bg-slate-800 rounded-lg text-red-400 transition-colors"
                                                            title="Cancel Trial"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}

                                                {/* Archive / Restore */}
                                                {u.archived ? (
                                                    <button
                                                        onClick={() => setConfirmAction({ type: 'RESTORE', user: u, isOpen: true })}
                                                        className="p-2 hover:bg-slate-800 rounded-lg text-emerald-400 transition-colors"
                                                        title="Restore User"
                                                    >
                                                        <ArchiveRestore className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmAction({ type: 'ARCHIVE', user: u, isOpen: true })}
                                                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-300 transition-colors"
                                                        title="Archive User"
                                                    >
                                                        <Archive className="w-4 h-4" />
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
                                                {/* Edit User */}
                                                <button
                                                    onClick={() => openEditModal(u)}
                                                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                                                    title="Edit User"
                                                >
                                                    <Pencil className="w-4 h-4" />
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
                                        {showArchived ? 'No archived users found.' : 'No users found.'}
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
                            {/* Access Actions */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Access</h4>
                                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-400">Current</span>
                                        <span className={cn(
                                            "text-xs font-bold",
                                            getEffectiveAccess(selectedUser).type === 'tester' ? "text-purple-400" :
                                                getEffectiveAccess(selectedUser).type === 'trial' ? "text-amber-400" :
                                                    getEffectiveAccess(selectedUser).type === 'paid' ? "text-emerald-400" :
                                                        "text-slate-500"
                                        )}>
                                            {getEffectiveAccess(selectedUser).label}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setConfirmAction({ type: 'GRANT_FRESH_TRIAL', user: selectedUser, isOpen: true })}
                                        disabled={actionLoading}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Grant New 14-Day Trial
                                    </button>
                                </div>
                            </div>

                            {/* Debug Info */}
                            <div className="bg-slate-800 p-4 rounded-xl font-mono text-xs text-slate-400 overflow-x-auto">
                                <pre>{JSON.stringify(getEffectiveAccess(selectedUser), null, 2)}</pre>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Edit User Modal */}
            {editUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-white">Edit User</h3>
                            <button onClick={() => { setEditUser(null); setEmailConfirmOpen(false); }}>
                                <X className="w-6 h-6 text-slate-400 hover:text-white transition-colors" />
                            </button>
                        </div>

                        {/* Read-only section */}
                        <div className="mb-6 space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Identity (Read-Only)</h4>
                            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-400">UID</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-white font-mono truncate max-w-[250px]">{editUser.uid}</span>
                                        <button
                                            onClick={() => { navigator.clipboard.writeText(editUser.uid); setMessage({ type: 'success', text: 'UID copied' }); }}
                                            className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-white transition-colors"
                                            title="Copy UID"
                                        >
                                            <Copy className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-400">Joined</span>
                                    <span className="text-sm text-white">{editUser.createdAt?.toDate().toLocaleDateString() || '—'}</span>
                                </div>
                                {editUser.authProvider && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-400">Auth Provider</span>
                                        <span className="text-sm text-white">{editUser.authProvider}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Editable profile fields */}
                        <div className="mb-6 space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Profile</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        value={editForm.firstName}
                                        onChange={(e) => setEditForm(f => ({ ...f, firstName: e.target.value }))}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                                        placeholder="First name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        value={editForm.lastName}
                                        onChange={(e) => setEditForm(f => ({ ...f, lastName: e.target.value }))}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                                        placeholder="Last name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Display Name</label>
                                    <input
                                        type="text"
                                        value={editForm.displayName}
                                        onChange={(e) => setEditForm(f => ({ ...f, displayName: e.target.value }))}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                                        placeholder="Display name"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Email section */}
                        <div className="mb-6 space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Email</h4>
                            <div>
                                <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                                    placeholder="user@example.com"
                                />
                                {editForm.email.trim() !== (editUser.email || '') && (
                                    <p className="text-amber-400 text-xs mt-2 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        Changing email also updates Firebase Auth
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Account Status (read-only pills with action hints) */}
                        <div className="mb-8 space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Account Status</h4>
                            <div className="flex flex-wrap gap-2">
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold border",
                                    editUser.disabled
                                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                )}>
                                    {editUser.disabled ? 'Disabled' : 'Active'}
                                </span>
                                {editUser.archived && (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                        Archived
                                    </span>
                                )}
                                {editUser.testerOverride && (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                        Tester
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-500">Use the table action buttons to toggle disable/archive status.</p>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setEditUser(null); setEmailConfirmOpen(false); }}
                                className="flex-1 px-4 py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-all border border-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={saveLoading}
                                onClick={handleEditSave}
                                className="flex-1 px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition-all flex items-center justify-center gap-2"
                            >
                                {saveLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </div>

                    {/* Email Confirmation Dialog (nested, higher z-index) */}
                    {emailConfirmOpen && (
                        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-150">
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                                        <AlertTriangle className="w-8 h-8 text-red-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-3">Confirm Email Change</h3>
                                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-left space-y-2 mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500 w-12">From:</span>
                                            <span className="text-sm text-red-300 font-mono">{editUser.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500 w-12">To:</span>
                                            <span className="text-sm text-emerald-300 font-mono">{editForm.email.trim()}</span>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-sm">
                                        This will update both Firestore and Firebase Auth. Are you sure?
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setEmailConfirmOpen(false)}
                                        className="flex-1 px-4 py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-all border border-slate-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={saveLoading}
                                        onClick={handleEditSave}
                                        className="flex-1 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        {saveLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Confirm
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
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
