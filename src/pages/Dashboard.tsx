import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getDashboardStats, getRecentAuditLogs } from '../services/firestoreService';
import { useApp } from '../context/AppContext';
import {
    Users,
    UserCheck,
    Zap,
    Clock,
    Shield,
    ArrowUpRight,
    Loader2
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 transition-all duration-300 hover:border-slate-700 group">
        <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-2xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
            </div>
            <div className="bg-slate-800 p-1 rounded-lg">
                <ArrowUpRight className="w-4 h-4 text-slate-500" />
            </div>
        </div>
        <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
        <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">{value}</span>
            {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
        </div>
    </div>
);

const Dashboard: React.FC = () => {
    const { appId } = useApp();
    const { isAdmin, loading: authLoading } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!isAdmin) return;
            try {
                const [statsData, logsData] = await Promise.all([
                    getDashboardStats(),
                    getRecentAuditLogs(appId, 6)
                ]);
                setStats(statsData);
                setAuditLogs(logsData);
            } catch (error) {
                console.error("Dashboard fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading && isAdmin) {
            fetchData();
        }
    }, [appId, authLoading, isAdmin]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    const chartData = [
        { name: 'Total', value: stats?.totalUsers || 0, color: '#3b82f6' },
        { name: 'Pro', value: stats?.proUsers || 0, color: '#10b981' },
        { name: 'Trial', value: stats?.trialUsers || 0, color: '#f59e0b' },
        { name: 'New (30d)', value: stats?.recentSignups || 0, color: '#8b5cf6' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Overview</h1>
                    <p className="text-slate-400">System performance and user engagement metrics</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2 text-sm text-slate-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Last updated: {new Date().toLocaleTimeString()}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Users"
                    value={stats?.totalUsers}
                    icon={Users}
                    color="bg-blue-500"
                    subtitle="All-time registered"
                />
                <StatCard
                    title="Pro Members"
                    value={stats?.proUsers}
                    icon={UserCheck}
                    color="bg-emerald-500"
                    subtitle="Active subscriptions"
                />
                <StatCard
                    title="In Trial"
                    value={stats?.trialUsers}
                    icon={Zap}
                    color="bg-amber-500"
                    subtitle="Currently testing"
                />
                <StatCard
                    title="Recent Signups"
                    value={stats?.recentSignups}
                    icon={Clock}
                    color="bg-purple-500"
                    subtitle="Last 30 days"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Card */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-8">
                    <h2 className="text-xl font-bold text-white mb-8">User Distribution</h2>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                />
                                <RechartsTooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{
                                        backgroundColor: '#0f172a',
                                        border: '1px solid #1e293b',
                                        borderRadius: '12px',
                                        color: '#fff'
                                    }}
                                />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Audit Log Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold text-white">Recent Activity</h2>
                        <Shield className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="space-y-6">
                        {auditLogs.length > 0 ? auditLogs.map((log) => (
                            <div key={log.id} className="flex gap-4">
                                <div className="w-2 h-2 rounded-full bg-brand-500 mt-2 shrink-0 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
                                <div>
                                    <p className="text-sm text-slate-200 leading-tight">
                                        <span className="font-bold text-white">Admin</span> {log.action.replace(/_/g, ' ')}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {log.timestamp?.toDate().toLocaleString() || 'Just now'}
                                    </p>
                                </div>
                            </div>
                        )) : (
                            <p className="text-sm text-slate-500 italic text-center py-8">No recent activity detected.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
