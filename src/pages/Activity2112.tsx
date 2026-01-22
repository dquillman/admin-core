import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
    getRecentDecisions,
    getRecentSimulations,
    getAppHealth,
    getLatestBriefing,
    simulateDecision,
    getLiveTutorEngagement
} from '../services/activityService';
import type { Decision, App, FounderBriefing, SimulationScenario } from '../types';
import { Timestamp } from 'firebase/firestore';
import { Activity } from 'lucide-react';

// Helper for relative time (e.g. "2 hours ago")
const timeAgo = (timestamp?: Timestamp | null) => {
    if (!timestamp) return 'Never';
    const date = timestamp.toDate();
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
};

// UI Components
const SectionHeader = ({ title }: { title: string }) => (
    <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-3 border-b border-slate-700/50 pb-2">
        {title}
    </h2>
);

const Activity2112 = () => {
    const { isAdmin, loading: authLoading } = useAuth();
    const [decisions, setDecisions] = useState<Decision[]>([]);
    const [apps, setApps] = useState<App[]>([]);
    const [briefing, setBriefing] = useState<FounderBriefing | null>(null);
    const [liveSignalCount, setLiveSignalCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    // Simulation State
    const [simAppId, setSimAppId] = useState('exam-coach-ai-platform');
    const [simScenario, setSimScenario] = useState<SimulationScenario>('silent_app');
    const [simulating, setSimulating] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [realDecisions, simulationDecisions, a, b, signal] = await Promise.all([
                getRecentDecisions(),
                getRecentSimulations(),
                getAppHealth(),
                getLatestBriefing(),
                getLiveTutorEngagement()
            ]);

            // Merge and sort decisions by date (desc)
            const allDecisions = [...realDecisions, ...simulationDecisions].sort((x, y) => {
                return y.created_at.toMillis() - x.created_at.toMillis();
            });

            setDecisions(allDecisions);
            setApps(a);
            setBriefing(b);
            setLiveSignalCount(signal);
        } catch (error) {
            console.error("Failed to load 2112 data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && isAdmin) {
            loadData();
        }
    }, [authLoading, isAdmin]);

    const handleSimulate = async () => {
        if (!isAdmin) return;
        setSimulating(true);
        await simulateDecision(simAppId, simScenario);
        await loadData(); // Refresh list
        setSimulating(false);
    };

    if (loading) {
        return <div className="p-8 text-slate-400 font-mono animate-pulse">Initializing 2112 Activity Stream...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">2112 Activity</h1>
                <p className="text-slate-400">System status and autonomous judgments.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COLUMN: Feed */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Founder Briefing */}
                    {briefing && (
                        <section>
                            <SectionHeader title="Latest Founder Briefing" />
                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-white font-medium">Briefing: {briefing.period_start.toDate().toLocaleDateString()} - {briefing.period_end.toDate().toLocaleDateString()}</h3>
                                    <span className="text-xs text-slate-500">{timeAgo(briefing.created_at)}</span>
                                </div>
                                <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line mb-4">
                                    {briefing.summary}
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {briefing.topics.map(topic => (
                                        <span key={topic} className="px-2 py-1 bg-slate-800 text-slate-400 text-xs rounded border border-slate-700">
                                            {topic}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Recent Decisions */}
                    <section>
                        <SectionHeader title="Recent Decisions" />
                        <div className="space-y-3">
                            {decisions.length === 0 ? (
                                <div className="text-slate-500 italic p-4 border border-dashed border-slate-800 rounded">No recent decisions recorded.</div>
                            ) : (
                                decisions.map(decision => (
                                    <div key={decision.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex gap-4">
                                        <div className="shrink-0 pt-1">
                                            <div className={`w-2 h-2 rounded-full ${decision.status === 'simulated' ? 'bg-amber-500' :
                                                decision.status === 'implemented' ? 'bg-emerald-500' :
                                                    decision.status === 'rejected' ? 'bg-red-500' :
                                                        'bg-blue-500'
                                                }`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="text-sm font-medium text-slate-200">
                                                    {decision.type.replace('_', ' ')}
                                                    <span className="ml-2 text-xs font-normal text-slate-500 font-mono">
                                                        {(decision.confidence * 100).toFixed(0)}% conf
                                                    </span>
                                                </div>
                                                <span className="text-xs text-slate-600 font-mono">{timeAgo(decision.created_at)}</span>
                                            </div>

                                            <p className="text-slate-400 text-sm mb-2">{decision.reasoning.summary}</p>

                                            <div className="bg-slate-950/50 rounded p-2 text-xs font-mono text-emerald-400/80 border border-slate-800/50">
                                                → {decision.recommended_action}
                                            </div>

                                            {decision.status === 'simulated' && (
                                                <div className="mt-2 inline-flex items-center text-[10px] uppercase text-amber-500/70 border border-amber-900/30 px-1.5 py-0.5 rounded bg-amber-950/20">
                                                    Simulation
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                {/* RIGHT COLUMN: Health & Tools */}
                <div className="space-y-8">

                    {/* App Health */}
                    <section>
                        <SectionHeader title="App Health Changes" />
                        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg overflow-hidden">
                            {apps.length === 0 ? (
                                <div className="p-4 text-sm text-green-500/80">All apps functioning normally.</div>
                            ) : (
                                <div className="divide-y divide-slate-800/50">
                                    {apps.map(app => (
                                        <div key={app.id} className="p-3">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-slate-300">{app.name}</span>
                                                <span className={`text-xs px-1.5 py-0.5 rounded uppercase ${app.health.state === 'critical' ? 'bg-red-950 text-red-400 border border-red-900' :
                                                    app.health.state === 'warning' ? 'bg-amber-950 text-amber-400 border border-amber-900' :
                                                        'bg-slate-800 text-slate-400'
                                                    }`}>
                                                    {app.health.state}
                                                </span>
                                            </div>
                                            {app.health.issues && app.health.issues.length > 0 && (
                                                <ul className="list-disc list-inside text-xs text-slate-500 mt-1">
                                                    {app.health.issues.map((issue, idx) => (
                                                        <li key={idx}>{issue}</li>
                                                    ))}
                                                </ul>
                                            )}
                                            {/* Derived Warning Logic */}
                                            {(() => {
                                                if (!app.last_event_at) return null;
                                                const diffDays = (new Date().getTime() - app.last_event_at.toDate().getTime()) / (86400000);
                                                if (diffDays > 3) {
                                                    return (
                                                        <div className="mt-2 text-xs text-amber-500/80 flex items-center gap-1">
                                                            ⚠️ Silence Warning ({Math.floor(diffDays)}d)
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Observed Live Signals */}
                    <section>
                        <SectionHeader title="Observed Live Signals" />
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2">
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/30 border border-emerald-900/30">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Live</span>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="mt-1 p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                                    <Activity className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-slate-200 mb-0.5">Weekly Active Learners</div>
                                    <div className="text-2xl font-bold text-white mb-1">
                                        {liveSignalCount !== null ? liveSignalCount : '...'}
                                    </div>
                                    <div className="text-xs text-slate-400 leading-snug">
                                        Users active in 7d who engaged with Tutor explanations.
                                        <br />
                                        <span className="text-slate-500 italic">Signal suggests retention health.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Simulation Panel (Admin Only) */}
                    {isAdmin && (
                        <section className="border border-amber-900/30 rounded-lg bg-amber-950/5 p-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-1">
                                <span className="text-[10px] text-amber-600 bg-amber-950/40 px-1 rounded border border-amber-900/40">TEST MODE</span>
                            </div>
                            <h3 className="text-sm font-semibold text-amber-500 mb-4 flex items-center gap-2">
                                2112 Simulation
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Target App</label>
                                    <select
                                        className="w-full bg-slate-950 border border-slate-800 rounded text-sm text-slate-300 p-2 focus:ring-1 focus:ring-amber-900 outline-none"
                                        value={simAppId}
                                        onChange={(e) => setSimAppId(e.target.value)}
                                        disabled={simulating}
                                    >
                                        <option value="exam-coach-ai-platform">Exam Coach AI</option>
                                        <option value="other-app">Other App</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Scenario</label>
                                    <select
                                        className="w-full bg-slate-950 border border-slate-800 rounded text-sm text-slate-300 p-2 focus:ring-1 focus:ring-amber-900 outline-none"
                                        value={simScenario}
                                        onChange={(e) => setSimScenario(e.target.value as SimulationScenario)}
                                        disabled={simulating}
                                    >
                                        <option value="silent_app">Silent App Alert</option>
                                        <option value="high_friction">High Friction Funnel</option>
                                        <option value="low_conversion">Low Conversion Detected</option>
                                    </select>
                                </div>

                                <button
                                    onClick={handleSimulate}
                                    disabled={simulating}
                                    className="w-full bg-amber-900/20 hover:bg-amber-900/40 border border-amber-900/50 text-amber-500 text-sm font-medium py-2 rounded transition-colors flex justify-center items-center gap-2"
                                >
                                    {simulating ? 'Processing...' : 'Simulate Decision'}
                                </button>

                                <p className="text-[10px] text-slate-600 text-center">
                                    Generates a synthetic decision record. Does not affect production traffic.
                                </p>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Activity2112;
