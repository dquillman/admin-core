import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getDashboardStats, getRecentAuditLogs } from '../services/firestoreService';
import { getActivationMetrics as getActivationMetricsService } from '../services/analyticsService'; // Import from analytics service
import { getLatestWeeklyReview } from '../services/weeklyReviewService';
import FounderAlerts from '../components/FounderAlerts';
import DataIntegrityPanel from '../components/DataIntegrityPanel';
import { useApp } from '../context/AppContext';
import {
    UserCheck,
    Zap,
    Clock,
    Shield,
    ArrowUpRight,
    Loader2,
    CheckCircle as CheckCircle3,
    AlertTriangle
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
    const [activation, setActivation] = useState<{ totalUsers: number; activatedUsers: number; activationRate: number } | null>(null);
    const [weeklyFocus, setWeeklyFocus] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const fetchData = async () => {
            if (!isAdmin) return;
            try {
                const [statsData, logsData, activationData] = await Promise.all([
                    getDashboardStats(),
                    getRecentAuditLogs(appId, 6),
                    getActivationMetricsService()
                ]);

                // Fetch latest review specifically for the focus card
                // Imported dynamically or handled here? 
                // We need to import it.
                // Assuming import is added below.

                // Fetch latest review specifically for the focus card
                const latestReview = await getLatestWeeklyReview();
                setWeeklyFocus(latestReview ? latestReview.founderDecision : null);

                setStats(statsData);
                setAuditLogs(logsData);
                setActivation(activationData);
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
        { name: 'Granted', value: stats?.grantedTesters || 0, color: '#10b981' },
        { name: 'Revoked', value: stats?.revokedTesters || 0, color: '#f59e0b' },
        { name: 'Disabled', value: stats?.disabledUsers || 0, color: '#ef4444' },
    ];

    // Determine System Status based on Activation
    const systemStatus = !activation ? 'loading' :
        activation.activationRate < 30 ? 'risk' :
            activation.activationRate < 40 ? 'warning' : 'healthy';

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-end justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-4xl font-bold text-white tracking-tight">Overview</h1>

                        {/* System Status Badge */}
                        <div className={`px-3 py-1 rounded-full border text-sm font-bold flex items-center gap-2
                            ${systemStatus === 'risk' ? 'bg-red-500/10 border-red-500/20 text-red-400' : ''}
                            ${systemStatus === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : ''}
                            ${systemStatus === 'healthy' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : ''}
                        `}>
                            <div className={`w-2 h-2 rounded-full 
                                ${systemStatus === 'risk' ? 'bg-red-500 animate-pulse' : ''}
                                ${systemStatus === 'warning' ? 'bg-amber-500' : ''}
                                ${systemStatus === 'healthy' ? 'bg-emerald-500' : ''}
                            `} />
                            {systemStatus === 'risk' && 'SYSTEM AT RISK'}
                            {systemStatus === 'warning' && 'SYSTEM WARNING'}
                            {systemStatus === 'healthy' && 'SYSTEM HEALTHY'}
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2 text-sm text-slate-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Last updated: {new Date().toLocaleTimeString()}
                </div>
            </div>

            {/* This Week's Focus - Replaces Metrics Grid as Primary */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-32 bg-brand-500/5 rounded-full blur-3xl group-hover:bg-brand-500/10 transition-colors duration-700" />

                <h2 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">This Week's Operating Focus</h2>

                {weeklyFocus ? (
                    <div className="flex items-start gap-6">
                        <div className="flex-1">
                            <p className="text-3xl font-bold text-white leading-tight mb-4">"{weeklyFocus}"</p>
                            <div className="flex items-center gap-2 text-brand-400 text-sm font-bold">
                                <CheckCircle3 className="w-4 h-4" />
                                <span>Committed by Admin</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-4 text-slate-500">
                        <AlertTriangle className="w-6 h-6 text-amber-500" />
                        <p>No decision logged for this week. Waiting for review...</p>
                    </div>
                )}
            </div>



            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard
                    title="Granted (Pro)"
                    value={stats?.grantedTesters || 0}
                    icon={UserCheck}
                    color="bg-emerald-500"
                    subtitle="Total Granted"
                />
                <StatCard
                    title="Revoked (Pro)"
                    value={stats?.revokedTesters || 0}
                    icon={Shield}
                    color="bg-amber-500"
                    subtitle="Total Revoked"
                />
                <StatCard
                    title="Disabled Users"
                    value={stats?.disabledUsers || 0}
                    icon={AlertTriangle}
                    color="bg-red-500"
                    subtitle="Access Blocked"
                />

                {/* Operational Counter */}
                <StatCard
                    title="Activation Rate"
                    value={`${activation?.activationRate.toFixed(1)}%`}
                    icon={Zap}
                    color="bg-orange-500"
                    subtitle={`${activation?.activatedUsers} / ${activation?.totalUsers} users`}
                />
            </div>

            <div className="mt-8">
                <DataIntegrityPanel />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Founder Alerts - Taking prominent spot */}
                <div className="lg:col-span-2">
                    <FounderAlerts />
                </div>

                {/* Audit Log Card - Moved to side or below */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 lg:row-span-2">
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

                {/* Chart Card - Moved below alerts */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-8">
                    <h2 className="text-xl font-bold text-white mb-8">User Distribution</h2>
                    <div className="h-[300px] w-full min-h-[300px]">
                        {isMounted && (
                            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
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
                        )}
                    </div>
                </div>


            </div>
        </div>
    );
};

export default Dashboard;
