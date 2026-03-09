import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, Users, CheckCircle2, Timer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getAllAnalytics, getFlows } from '../services/onboardingService';
import type { OnboardingAnalytics as AnalyticsType, OnboardingFlow } from '../types';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

export default function OnboardingAnalytics() {
    const [analytics, setAnalytics] = useState<AnalyticsType[]>([]);
    const [flows, setFlows] = useState<OnboardingFlow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [analyticsData, flowsData] = await Promise.all([
                    getAllAnalytics(),
                    getFlows(),
                ]);
                setAnalytics(analyticsData);
                setFlows(flowsData);
            } catch (error) {
                console.error('Error loading analytics:', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const totalSessions = analytics.reduce((sum, a) => sum + a.totalSessions, 0);
    const totalCompleted = analytics.reduce((sum, a) => sum + a.completedSessions, 0);
    const completionRate = totalSessions > 0 ? Math.round((totalCompleted / totalSessions) * 100) : 0;
    const avgTime = analytics.length > 0
        ? Math.round(analytics.reduce((sum, a) => sum + a.avgCompletionTime, 0) / analytics.length)
        : 0;

    const flowNameMap = Object.fromEntries(flows.map(f => [f.id, f.name]));

    const barData = analytics.map(a => ({
        name: flowNameMap[a.flowId] || a.flowId.slice(0, 8),
        sessions: a.totalSessions,
        completed: a.completedSessions,
    }));

    const pieData = analytics.map(a => ({
        name: flowNameMap[a.flowId] || a.flowId.slice(0, 8),
        value: a.totalSessions,
    }));

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Onboarding Analytics</h1>
                <p className="text-slate-400">Track flow performance, completion rates, and user dropoff</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total Sessions" value={totalSessions} color="brand" />
                <StatCard icon={CheckCircle2} label="Completed" value={totalCompleted} color="emerald" />
                <StatCard icon={TrendingUp} label="Completion Rate" value={`${completionRate}%`} color="violet" />
                <StatCard icon={Timer} label="Avg. Time" value={`${avgTime}s`} color="amber" />
            </div>

            {analytics.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
                    <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg font-medium">No analytics data yet</p>
                    <p className="text-slate-500 text-sm mt-1">Data will appear here once users start completing flows</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sessions by Flow */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Sessions by Flow</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 12 }}
                                    labelStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="sessions" fill="#6366f1" radius={[6, 6, 0, 0]} name="Total" />
                                <Bar dataKey="completed" fill="#10b981" radius={[6, 6, 0, 0]} name="Completed" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Distribution Pie */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Session Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={4}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                >
                                    {pieData.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 12 }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Dropoff Table */}
                    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Step Dropoff by Flow</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-800">
                                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Flow</th>
                                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Sessions</th>
                                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Completed</th>
                                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Rate</th>
                                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Avg Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analytics.map(a => {
                                        const rate = a.totalSessions > 0 ? Math.round((a.completedSessions / a.totalSessions) * 100) : 0;
                                        return (
                                            <tr key={a.flowId} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                                <td className="py-3 px-4 text-white font-medium">{flowNameMap[a.flowId] || a.flowId}</td>
                                                <td className="py-3 px-4 text-slate-300 text-right">{a.totalSessions}</td>
                                                <td className="py-3 px-4 text-slate-300 text-right">{a.completedSessions}</td>
                                                <td className="py-3 px-4 text-right">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                                        rate >= 70 ? 'text-emerald-400 bg-emerald-500/10' :
                                                        rate >= 40 ? 'text-amber-400 bg-amber-500/10' :
                                                        'text-red-400 bg-red-500/10'
                                                    }`}>
                                                        {rate}%
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-slate-400 text-right font-mono">{a.avgCompletionTime}s</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
    const colorMap: Record<string, string> = {
        brand: 'text-brand-400 bg-brand-500/10 border-brand-500/20',
        emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
        amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    };
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colorMap[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-3xl font-bold text-white">{value}</p>
        </div>
    );
}
