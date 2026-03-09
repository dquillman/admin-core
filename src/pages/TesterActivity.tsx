import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useApp } from '../context/AppContext';
import { getUserSessions, getTesterUsers } from '../services/firestoreService';
import { useAppSubscribers } from '../hooks/useAppSubscribers';
import type { SessionFilters, SessionRecord } from '../services/firestoreService';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import type { User } from '../types';
import { APP_OPTIONS } from '../constants';
import {
    Activity,
    Search,
    Clock,
    User as UserIcon,
    Calendar,
    Loader2,
    Info,
    Filter
} from 'lucide-react';
import { format } from 'date-fns';

const ACTIVE_NOW_THRESHOLD_SECONDS = 120;

const TesterActivity: React.FC = () => {
    const { appId } = useApp();
    const { isAdmin, loading: authLoading } = useAuth();
    const { filterByApp } = useAppSubscribers();
    const [sessions, setSessions] = useState<SessionRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<SessionFilters>({
        appId: appId,
        dateRange: '24h',
        activeOnly: false,
        email: ''
    });
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
    const [hasMore, setHasMore] = useState(false);

    // Tester + App filter state
    const [testers, setTesters] = useState<User[]>([]);
    const [filterTester, setFilterTester] = useState<string>('all');
    const [filterApp, setFilterApp] = useState<string>('all');

    useEffect(() => {
        if (!authLoading && isAdmin) {
            fetchInitialData();
            getTesterUsers().then(data => setTesters(filterByApp(data))).catch((err) => console.error('Failed to fetch testers:', err));
        }
    }, [appId, filters.dateRange, filters.activeOnly, authLoading, isAdmin, filterByApp]);

    const fetchInitialData = async () => {
        if (!isAdmin) return;
        setLoading(true);
        try {
            const sessionData = await getUserSessions({ ...filters, appId });
            setSessions(sessionData);

            if (sessionData.length > 0) {
                setLastDoc(sessionData[sessionData.length - 1]._raw);
                setHasMore(sessionData.length === 50);
            } else {
                setLastDoc(null);
                setHasMore(false);
            }
        } catch (error) {
            console.error("Error fetching sessions:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchInitialData();
    };

    const loadMore = async () => {
        if (!lastDoc) return;
        try {
            const moreData = await getUserSessions({ ...filters, appId, lastDoc });
            setSessions(prev => [...prev, ...moreData]);
            if (moreData.length > 0) {
                setLastDoc(moreData[moreData.length - 1]._raw);
                setHasMore(moreData.length === 50);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Error loading more sessions:", error);
        }
    };

    const formatDuration = (seconds: number | null) => {
        if (seconds === null) return '-';
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        return `${hours}h ${mins % 60}m`;
    };

    const isActiveNow = (session: SessionRecord) => {
        if (session.logoutAt) return false;
        if (!session.lastSeenAt) return false;
        const lastSeen = session.lastSeenAt.toDate();
        const diff = (new Date().getTime() - lastSeen.getTime()) / 1000;
        return diff < ACTIVE_NOW_THRESHOLD_SECONDS;
    };

    const testerDisplayName = (u: User): string => {
        const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.displayName || '';
        return name ? `${name} (${u.email})` : u.email || u.uid;
    };

    // Derived: client-side filtered sessions, sorted by lastActivity desc (preserve server order)
    const filteredSessions = useMemo(() => {
        return sessions.filter(s => {
            if (filterTester !== 'all' && s.email !== filterTester) return false;
            if (filterApp !== 'all' && s.app !== filterApp) return false;
            return true;
        });
    }, [sessions, filterTester, filterApp]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Tester Activity</h1>
                    <p className="text-slate-400">Monitor real-time sessions and usage across {appId}</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-3 flex items-center gap-4">
                        <Activity className="w-5 h-5 text-slate-400" />
                        <div className="flex flex-col">
                            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Live Sessions</span>
                            <span className="text-white font-bold text-lg leading-tight">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : filteredSessions.filter(s => isActiveNow(s)).length}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-6">
                    <div className="flex-1 min-w-[300px] relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search by email..."
                            value={filters.email}
                            onChange={(e) => setFilters(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                            {(['24h', '7d', '30d'] as const).map((range) => (
                                <button
                                    key={range}
                                    type="button"
                                    onClick={() => setFilters(prev => ({ ...prev, dateRange: range }))}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filters.dateRange === range
                                        ? 'bg-slate-800 text-white shadow-lg'
                                        : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    {range.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={filters.activeOnly}
                                    onChange={(e) => setFilters(prev => ({ ...prev, activeOnly: e.target.checked }))}
                                />
                                <div className={`block w-12 h-6 rounded-full border border-slate-700 transition-colors ${filters.activeOnly ? 'bg-brand-500/20 border-brand-500' : 'bg-slate-950'}`}></div>
                                <div className={`absolute left-1 top-1 w-4 h-4 rounded-full transition-transform duration-200 shadow-md ${filters.activeOnly ? 'translate-x-6 bg-brand-500' : 'bg-slate-600'}`}></div>
                            </div>
                            <span className={`text-sm font-medium transition-colors ${filters.activeOnly ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>
                                Active Only
                            </span>
                        </label>
                    </div>
                </form>
            </div>

            {/* Tester + App dropdowns */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                    <Filter className="w-4 h-4" />
                    <span>Filter:</span>
                </div>

                <select
                    value={filterTester}
                    onChange={(e) => setFilterTester(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 p-2.5"
                >
                    <option value="all">All Testers</option>
                    {testers.map(u => (
                        <option key={u.uid} value={u.email || u.uid}>
                            {testerDisplayName(u)}
                        </option>
                    ))}
                </select>

                <select
                    value={filterApp}
                    onChange={(e) => setFilterApp(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 p-2.5"
                >
                    <option value="all">All Apps</option>
                    {APP_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {/* Sessions Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
                {loading && sessions.length === 0 && (
                    <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px] z-10 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950/50 border-b border-slate-800">
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Tester / Email</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">App</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Login / Last Seen</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Logout / Source</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Duration</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredSessions.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="p-4 bg-slate-950 rounded-full border border-slate-800">
                                                <Activity className="w-8 h-8 text-slate-700" />
                                            </div>
                                            <div>
                                                {(filterTester !== 'all' || filterApp !== 'all') ? (
                                                    <p className="text-slate-300 font-medium">No activity found for selected filters.</p>
                                                ) : (
                                                    <>
                                                        <p className="text-slate-300 font-medium">No sessions found</p>
                                                        <p className="text-slate-500 text-sm mt-1">Try changing filters or log into {appId} to generate data.</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredSessions.map((session) => (
                                    <tr key={session.id} className="hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center group-hover:border-brand-500/30 transition-colors">
                                                    <UserIcon className="w-5 h-5 text-slate-400 group-hover:text-brand-400" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-white truncate max-w-[200px]">{session.email || 'Anonymous'}</span>
                                                    <span className="text-xs text-slate-500 font-mono">{session.userId?.slice(0, 8)}...</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                {session.app}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                                    {format(session.loginAt.toDate(), 'MMM d, HH:mm')}
                                                </div>
                                                {session.lastSeenAt && (
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        Last: {format(session.lastSeenAt.toDate(), 'HH:mm:ss')}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-sm text-slate-300">
                                                    {session.logoutAt ? format(session.logoutAt.toDate(), 'MMM d, HH:mm') : '-'}
                                                </div>
                                                {session.endedBy && (
                                                    <div className={`text-[10px] font-bold uppercase tracking-tight py-0.5 px-2 rounded-md w-fit ${session.endedBy === 'logout' ? 'text-slate-400 bg-slate-950' : 'text-amber-500 bg-amber-500/10'
                                                        }`}>
                                                        {session.endedBy}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-sm font-mono text-slate-400">
                                            {formatDuration(session.durationSec)}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex justify-center">
                                                {isActiveNow(session) ? (
                                                    <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">Active</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-slate-500 bg-slate-950 border border-slate-800 px-3 py-1 rounded-full">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">Offline</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {hasMore && (
                    <div className="p-6 border-t border-slate-800 flex justify-center">
                        <button
                            onClick={loadMore}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-400 hover:text-white hover:border-slate-700 transition-all font-semibold disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Load More Sessions'}
                        </button>
                    </div>
                )}
            </div>

            {/* Info Card */}
            <div className="bg-brand-500/5 border border-brand-500/20 rounded-3xl p-6 flex gap-4">
                <Info className="w-6 h-6 text-brand-500 shrink-0" />
                <div className="text-sm text-slate-400 leading-relaxed">
                    <p className="font-semibold text-slate-200 mb-1">Session Tracking Implementation</p>
                    Sessions are created automatically when testers log into connected applications.
                    The heartbeat system updates the <code className="text-brand-400 bg-brand-400/10 px-1 rounded">lastSeenAt</code> every 60 seconds.
                    If a session shows as <span className="text-amber-500">timeout</span>, it was automatically closed by the server after 15 minutes of inactivity.
                </div>
            </div>
        </div>
    );
};

export default TesterActivity;
