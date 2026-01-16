import React, { useState, useEffect } from 'react';
import { searchUsers } from '../services/firestoreService';
import {
    getFunctions,
    httpsCallable
} from 'firebase/functions';
import {
    Search,
    User,
    Calendar,
    Shield,
    Ban,
    Trash2,
    MoreVertical,
    X,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    Zap
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const functions = getFunctions();

    useEffect(() => {
        fetchUsers();
    }, [searchTerm]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await searchUsers(searchTerm);
            setUsers(data);
        } catch (err) {
            console.error("Fetch users error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action: string, uid: string, data?: any) => {
        setActionLoading(true);
        setMessage(null);
        try {
            // In a real app, these would be Cloud Functions
            // For now, if functions are not deployed, we'll try calling or mock if we need to.
            // But the requirement says "Build helper: isAdmin(uid)" and role model.

            // We'll use placeholder calls but the structure is correct
            const callable = httpsCallable(functions, action);
            await callable({ targetUid: uid, ...data });

            setMessage({ type: 'success', text: `Successfully performed ${action}` });
            fetchUsers(); // Refresh list
        } catch (err: any) {
            console.error(`Action ${action} failed:`, err);
            setMessage({ type: 'error', text: err.message || `Action ${action} failed` });
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Users</h1>
                    <p className="text-slate-400">Manage platform members and their permissions</p>
                </div>

                <div className="relative max-w-md w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800/50 border-b border-slate-800">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">User</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Role</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Joined</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : users.length > 0 ? users.map((u) => (
                                <tr
                                    key={u.uid}
                                    className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                                    onClick={() => setSelectedUser(u)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 border border-slate-700">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-white truncate">{u.email}</p>
                                                <p className="text-[10px] text-slate-500 font-mono truncate">{u.uid}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                            u.role === 'admin' ? "bg-brand-500/10 text-brand-400" : "bg-slate-800 text-slate-400"
                                        )}>
                                            {u.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                            {u.role || 'user'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {u.disabled ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold uppercase tracking-wider">
                                                <Ban className="w-3 h-3" />
                                                Disabled
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold uppercase tracking-wider">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Active
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-400">
                                        {u.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                                        No users found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* User Detail Side Panel */}
            {selectedUser && (
                <>
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-300"
                        onClick={() => setSelectedUser(null)}
                    />
                    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 border-l border-slate-800 z-50 shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">User Details</h2>
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="p-2 hover:bg-slate-800 rounded-xl transition-all"
                            >
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            {/* Profile Header */}
                            <div className="text-center">
                                <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center text-slate-500 border-2 border-slate-700 mx-auto mb-4 shadow-xl">
                                    <User className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-bold text-white truncate">{selectedUser.email}</h3>
                                <p className="text-slate-500 text-sm font-mono mt-1">{selectedUser.uid}</p>
                                <div className="flex justify-center gap-2 mt-4">
                                    <span className={cn(
                                        "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider",
                                        selectedUser.role === 'admin' ? "bg-brand-500/10 text-brand-400 border border-brand-500/20" : "bg-slate-800 text-slate-400 border border-slate-700"
                                    )}>
                                        {selectedUser.role || 'user'}
                                    </span>
                                    <span className={cn(
                                        "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider",
                                        selectedUser.isPro ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800 text-slate-400 border border-slate-700"
                                    )}>
                                        {selectedUser.isPro ? 'Pro Member' : 'Standard'}
                                    </span>
                                </div>
                            </div>

                            {/* Status Banner */}
                            {selectedUser.disabled && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
                                    <Ban className="w-5 h-5 text-red-500" />
                                    <p className="text-sm text-red-200">This account is currently disabled.</p>
                                </div>
                            )}

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                                    <div className="flex items-center gap-2 text-slate-500 text-xs uppercase font-bold tracking-widest mb-1">
                                        <Calendar className="w-3 h-3" />
                                        Joined
                                    </div>
                                    <p className="text-white text-sm">
                                        {selectedUser.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                                    </p>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                                    <div className="flex items-center gap-2 text-slate-500 text-xs uppercase font-bold tracking-widest mb-1">
                                        <Zap className="w-3 h-3" />
                                        Trial Status
                                    </div>
                                    <p className="text-white text-sm">
                                        {selectedUser.trial?.active ? 'Active until ' + selectedUser.trial.endsAt?.toDate().toLocaleDateString() : 'Inactive'}
                                    </p>
                                </div>
                            </div>

                            {/* Action Message */}
                            {message && (
                                <div className={cn(
                                    "p-4 rounded-2xl border text-sm flex items-start gap-3",
                                    message.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200" : "bg-red-500/10 border-red-500/20 text-red-200"
                                )}>
                                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
                                    {message.text}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="space-y-3 pt-4 border-t border-slate-800">
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Admin Actions</h4>

                                <button
                                    disabled={actionLoading}
                                    onClick={() => handleAction('setUserRole', selectedUser.uid, { role: selectedUser.role === 'admin' ? 'user' : 'admin' })}
                                    className="w-full flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-2xl transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <Shield className="w-5 h-5 text-brand-400" />
                                        <span className="text-white font-medium">
                                            {selectedUser.role === 'admin' ? 'Revoke Admin Role' : 'Promote to Admin'}
                                        </span>
                                    </div>
                                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin text-brand-400" /> : <MoreVertical className="w-5 h-5 text-slate-600 group-hover:text-white" />}
                                </button>

                                <button
                                    disabled={actionLoading}
                                    onClick={() => handleAction('disableUser', selectedUser.uid, { disabled: !selectedUser.disabled })}
                                    className="w-full flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-2xl transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <Ban className="w-5 h-5 text-red-400" />
                                        <span className="text-white font-medium">
                                            {selectedUser.disabled ? 'Enable Account' : 'Disable Account'}
                                        </span>
                                    </div>
                                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin text-red-400" /> : <MoreVertical className="w-5 h-5 text-slate-600 group-hover:text-white" />}
                                </button>

                                <button
                                    disabled={actionLoading}
                                    className="w-full flex items-center justify-between p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-2xl transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <Trash2 className="w-5 h-5 text-red-500" />
                                        <span className="text-red-200 font-medium">Delete User</span>
                                    </div>
                                    <AlertTriangle className="w-5 h-5 text-red-500/50 group-hover:text-red-500" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                            <p className="text-[10px] text-slate-600 text-center uppercase tracking-[0.2em] font-bold">
                                Security Level: Level 3 Access Required
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default UsersPage;
