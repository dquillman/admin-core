import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllUsers } from '../services/firestoreService';
import { useAppSubscribers } from '../hooks/useAppSubscribers';
import {
    evaluateAlerts,
    DEFAULT_ALERT_RULES,
    type TriggeredAlert,
} from '../utils/billingAlerts';
import { getEffectiveAccess } from '../utils/effectiveAccess';
import { getBandFromScore, BAND_COLORS } from '../utils/usageScore';
import type { User } from '../types';
import { AlertTriangle, AlertCircle, Filter, RefreshCw, Bell, ChevronRight, X, ExternalLink } from 'lucide-react';

const BillingAlerts: React.FC = () => {
    const navigate = useNavigate();
    const { filterByApp } = useAppSubscribers();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterRuleId, setFilterRuleId] = useState<string>('all');
    const [selectedAlert, setSelectedAlert] = useState<TriggeredAlert | null>(null);

    const fetchUsers = () => {
        setLoading(true);
        setError(null);
        getAllUsers()
            .then(data => setUsers(filterByApp(data)))
            .catch((err) => {
                setError(err instanceof Error ? err.message : 'Failed to load users.');
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterByApp]);

    const allAlerts: TriggeredAlert[] = useMemo(
        () => evaluateAlerts(users, DEFAULT_ALERT_RULES),
        [users]
    );

    const filteredAlerts = useMemo(() => {
        if (filterRuleId === 'all') return allAlerts;
        return allAlerts.filter((a) => a.rule.id === filterRuleId);
    }, [allAlerts, filterRuleId]);

    // Count per rule for summary cards
    const ruleCountMap = useMemo(() => {
        const map: Record<string, number> = {};
        for (const rule of DEFAULT_ALERT_RULES) {
            map[rule.id] = 0;
        }
        for (const alert of allAlerts) {
            map[alert.rule.id] = (map[alert.rule.id] ?? 0) + 1;
        }
        return map;
    }, [allAlerts]);

    const SeverityBadge: React.FC<{ severity: 'warning' | 'critical' }> = ({ severity }) => {
        if (severity === 'critical') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border bg-red-950/60 border-red-800 text-red-400">
                    <AlertCircle className="w-3 h-3" />
                    Critical
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border bg-amber-950/60 border-amber-800 text-amber-400">
                <AlertTriangle className="w-3 h-3" />
                Warning
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Billing Alerts</h1>
                    <p className="text-sm text-slate-500 mt-1">Anomaly detection across users</p>
                </div>
                <button
                    onClick={fetchUsers}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-950/40 border border-red-800 rounded-2xl px-4 py-3 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Summary Cards — one per rule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {DEFAULT_ALERT_RULES.map((rule) => {
                    const count = ruleCountMap[rule.id] ?? 0;
                    const isCritical = rule.severity === 'critical';
                    return (
                        <button
                            key={rule.id}
                            onClick={() => setFilterRuleId(filterRuleId === rule.id ? 'all' : rule.id)}
                            className={`text-left bg-slate-900 border rounded-2xl p-4 transition-colors hover:border-slate-600 focus:outline-none ${
                                filterRuleId === rule.id
                                    ? 'border-brand-500 ring-1 ring-brand-500/30'
                                    : 'border-slate-800'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <Bell className={`w-4 h-4 ${isCritical ? 'text-red-400' : 'text-amber-400'}`} />
                                <span
                                    className={`text-2xl font-bold ${
                                        count > 0
                                            ? isCritical
                                                ? 'text-red-400'
                                                : 'text-amber-400'
                                            : 'text-slate-500'
                                    }`}
                                >
                                    {loading ? '—' : count}
                                </span>
                            </div>
                            <div className="text-sm font-medium text-slate-200 leading-tight">{rule.name}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{rule.description}</div>
                        </button>
                    );
                })}
            </div>

            {/* Filter Row */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                    <Filter className="w-4 h-4" />
                    <span>Filter by rule:</span>
                </div>
                <select
                    value={filterRuleId}
                    onChange={(e) => setFilterRuleId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 p-2.5"
                >
                    <option value="all">All Rules ({allAlerts.length})</option>
                    {DEFAULT_ALERT_RULES.map((rule) => (
                        <option key={rule.id} value={rule.id}>
                            {rule.name} ({ruleCountMap[rule.id] ?? 0})
                        </option>
                    ))}
                </select>
                {filterRuleId !== 'all' && (
                    <button
                        onClick={() => setFilterRuleId('all')}
                        className="text-xs text-slate-400 hover:text-slate-200 transition-colors underline underline-offset-2"
                    >
                        Clear filter
                    </button>
                )}
            </div>

            {/* Alerts Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-500 text-sm">Loading users...</div>
                ) : filteredAlerts.length === 0 ? (
                    <div className="p-12 text-center">
                        <AlertTriangle className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">
                            {allAlerts.length === 0
                                ? 'No alerts triggered. All users look healthy.'
                                : 'No alerts match the selected filter.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-950/50 border-b border-slate-800">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        User
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        Rule
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        Severity
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        Description
                                    </th>
                                    <th className="px-3 py-4 w-10" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {filteredAlerts.map((alert, idx) => {
                                    const { rule, user } = alert;
                                    const name = [user.firstName, user.lastName]
                                        .filter(Boolean)
                                        .join(' ') || user.displayName || '';
                                    return (
                                        <tr
                                            key={`${user.uid}-${rule.id}-${idx}`}
                                            onClick={() => setSelectedAlert(alert)}
                                            className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-white text-sm">
                                                    {name || user.email}
                                                </div>
                                                {name && (
                                                    <div className="text-xs text-slate-500">{user.email}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-200 font-medium">
                                                    {rule.name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <SeverityBadge severity={rule.severity} />
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-400 max-w-xs">
                                                {rule.description}
                                            </td>
                                            <td className="px-3 py-4">
                                                <ChevronRight className="w-4 h-4 text-slate-600" />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Footer count */}
            {!loading && filteredAlerts.length > 0 && (
                <p className="text-xs text-slate-600 text-right">
                    Showing {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''} across {users.length} user{users.length !== 1 ? 's' : ''}
                </p>
            )}

            {/* User Detail Side Panel */}
            {selectedAlert && (() => {
                const u = selectedAlert.user;
                const displayName = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.displayName || '';
                const access = getEffectiveAccess(u);
                const band = u.usageScore != null ? getBandFromScore(u.usageScore) : null;
                const bandColor = band ? BAND_COLORS[band] : null;
                const userAlerts = allAlerts.filter(a => a.user.uid === u.uid);

                return (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/40 z-40"
                            onClick={() => setSelectedAlert(null)}
                        />
                        {/* Panel */}
                        <div className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-800 z-50 shadow-2xl overflow-y-auto">
                            <div className="p-6 space-y-5">
                                {/* Header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h2 className="text-lg font-bold text-white truncate">
                                            {displayName || u.email}
                                        </h2>
                                        {displayName && (
                                            <p className="text-sm text-slate-400 truncate">{u.email}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setSelectedAlert(null)}
                                        className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Detail Fields */}
                                <div className="bg-slate-950/60 border border-slate-800 rounded-xl divide-y divide-slate-800">
                                    <div className="flex justify-between px-4 py-3">
                                        <span className="text-xs text-slate-500 uppercase tracking-wide">UID</span>
                                        <span className="text-sm text-slate-300 font-mono text-right truncate max-w-[200px]">{u.uid}</span>
                                    </div>
                                    <div className="flex justify-between px-4 py-3">
                                        <span className="text-xs text-slate-500 uppercase tracking-wide">Access</span>
                                        <span className={`text-sm font-medium ${
                                            access === 'tester' ? 'text-purple-400' :
                                            access === 'trial' ? 'text-amber-400' :
                                            access === 'paid' ? 'text-emerald-400' :
                                            'text-slate-400'
                                        }`}>
                                            {access.charAt(0).toUpperCase() + access.slice(1)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between px-4 py-3">
                                        <span className="text-xs text-slate-500 uppercase tracking-wide">Billing Status</span>
                                        <span className="text-sm text-slate-300">
                                            {u.billingStatus ?? 'unknown'}
                                            {u.billingSource ? ` (${u.billingSource})` : ''}
                                        </span>
                                    </div>
                                    <div className="flex justify-between px-4 py-3">
                                        <span className="text-xs text-slate-500 uppercase tracking-wide">Tester</span>
                                        <span className={`text-sm font-medium ${u.testerPro ? 'text-purple-400' : 'text-slate-500'}`}>
                                            {u.testerPro ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between px-4 py-3">
                                        <span className="text-xs text-slate-500 uppercase tracking-wide">Trial</span>
                                        <span className={`text-sm font-medium ${u.trialActive ? 'text-amber-400' : 'text-slate-500'}`}>
                                            {u.trialActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between px-4 py-3">
                                        <span className="text-xs text-slate-500 uppercase tracking-wide">Usage Score</span>
                                        {u.usageScore != null ? (
                                            <span className="text-sm font-medium" style={bandColor ? { color: bandColor } : undefined}>
                                                {u.usageScore} ({band})
                                            </span>
                                        ) : (
                                            <span className="text-sm text-slate-500">--</span>
                                        )}
                                    </div>
                                    {u.disabled && (
                                        <div className="flex justify-between px-4 py-3">
                                            <span className="text-xs text-slate-500 uppercase tracking-wide">Status</span>
                                            <span className="text-sm font-medium text-red-400">Disabled</span>
                                        </div>
                                    )}
                                </div>

                                {/* Alerts for this user */}
                                {userAlerts.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                            Alerts ({userAlerts.length})
                                        </h3>
                                        <div className="space-y-2">
                                            {userAlerts.map((a, i) => (
                                                <div
                                                    key={`${a.rule.id}-${i}`}
                                                    className="bg-slate-950/60 border border-slate-800 rounded-lg px-4 py-3"
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <SeverityBadge severity={a.rule.severity} />
                                                        <span className="text-sm text-slate-200 font-medium">{a.rule.name}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500">{a.rule.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Navigate to Users page */}
                                <button
                                    onClick={() => navigate(`/users?search=${encodeURIComponent(u.email || u.uid)}`)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    View in Users
                                </button>
                            </div>
                        </div>
                    </>
                );
            })()}
        </div>
    );
};

export default BillingAlerts;
