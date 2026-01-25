
import { Radar, Radio, Activity } from 'lucide-react';

const GodsView = () => {
    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">Gods View</h1>
                <p className="text-slate-400">System Oversight & Autonomous Logic State (Read-Only).</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* System State Summary */}
                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
                        <Activity className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-lg font-bold text-white">System State Summary</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
                            <span className="text-slate-400 text-sm">Global Status</span>
                            <span className="text-emerald-400 font-mono text-xs uppercase tracking-wider bg-emerald-950/30 px-2 py-1 rounded border border-emerald-900/50"> Nominal</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
                            <span className="text-slate-400 text-sm">Uptime</span>
                            <span className="text-slate-200 font-mono text-sm">99.98%</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
                            <span className="text-slate-400 text-sm">Active Nodes</span>
                            <span className="text-slate-200 font-mono text-sm">3 / 3</span>
                        </div>
                    </div>
                </section>

                {/* Attention Radar */}
                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
                        <Radar className="w-5 h-5 text-amber-400" />
                        <h2 className="text-lg font-bold text-white">Attention Radar</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex flex-col items-center justify-center gap-2">
                            <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Pending Issues</span>
                            <span className="text-2xl font-bold text-white">4</span>
                        </div>
                        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex flex-col items-center justify-center gap-2">
                            <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">New Users (24h)</span>
                            <span className="text-2xl font-bold text-white">12</span>
                        </div>
                        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex flex-col items-center justify-center gap-2">
                            <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Flagged Content</span>
                            <span className="text-2xl font-bold text-slate-600">0</span>
                        </div>
                        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex flex-col items-center justify-center gap-2">
                            <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">System Load</span>
                            <span className="text-2xl font-bold text-emerald-500">Low</span>
                        </div>
                    </div>
                </section>
            </div>

            {/* Decision Queue */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
                    <Radio className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-lg font-bold text-white">Decision Queue</h2>
                </div>

                <div className="space-y-2">
                    <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800/50 flex items-start gap-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2"></div>
                        <div>
                            <p className="text-slate-300 text-sm font-medium">Review Tutor Response Latency Spike</p>
                            <p className="text-xs text-slate-500 mt-1">Detected variance in region us-central1 &gt; 400ms.</p>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800/50 flex items-start gap-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600 mt-2"></div>
                        <div>
                            <p className="text-slate-400 text-sm font-medium">Routine Database Vacuuming</p>
                            <p className="text-xs text-slate-600 mt-1">Scheduled for 03:00 UTC. No action required.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default GodsView;
