import React, { useEffect, useState } from 'react';
import { getFounderAlerts, type FounderAlert } from '../services/alertService';
import { AlertCircle, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

const FounderAlerts: React.FC = () => {
    const [alerts, setAlerts] = useState<FounderAlert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAlerts = async () => {
            const data = await getFounderAlerts();
            // Sort: critical first, then warning, then good
            const sorted = data.sort((a, b) => {
                const priority = { critical: 0, warning: 1, good: 2 };
                return priority[a.level] - priority[b.level];
            });
            setAlerts(sorted);
            setLoading(false);
        };
        fetchAlerts();
    }, []);

    if (loading) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
            </div>
        );
    }

    if (alerts.length === 0) return null;

    // We only show the top priority alert as the "Next Best Action" in some views,
    // but here we list them all for the Founder console.

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-white px-1">Founder Alerts</h2>
            <div className="grid gap-4">
                {alerts.map((alert) => (
                    <div
                        key={alert.id}
                        className={`
                            relative overflow-hidden rounded-2xl p-6 border transition-all duration-300
                            ${alert.level === 'critical' ? 'bg-red-500/10 border-red-500/20 hover:border-red-500/40' : ''}
                            ${alert.level === 'warning' ? 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40' : ''}
                            ${alert.level === 'good' ? 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40' : ''}
                        `}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`
                                p-3 rounded-xl shrink-0
                                ${alert.level === 'critical' ? 'bg-red-500/20 text-red-400' : ''}
                                ${alert.level === 'warning' ? 'bg-amber-500/20 text-amber-400' : ''}
                                ${alert.level === 'good' ? 'bg-emerald-500/20 text-emerald-400' : ''}
                            `}>
                                {alert.level === 'critical' && <AlertCircle className="w-6 h-6" />}
                                {alert.level === 'warning' && <AlertTriangle className="w-6 h-6" />}
                                {alert.level === 'good' && <CheckCircle className="w-6 h-6" />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className={`text-sm font-bold uppercase tracking-wider
                                        ${alert.level === 'critical' ? 'text-red-400' : ''}
                                        ${alert.level === 'warning' ? 'text-amber-400' : ''}
                                        ${alert.level === 'good' ? 'text-emerald-400' : ''}
                                    `}>
                                        {alert.level} Signal
                                    </h3>
                                    <span className="text-xs font-mono text-slate-500 bg-slate-900/50 px-2 py-1 rounded-lg">
                                        {alert.metric}
                                    </span>
                                </div>
                                <p className="text-slate-300 font-medium mb-3">{alert.message}</p>

                                <div className="bg-slate-900/40 rounded-xl p-3 flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
                                    <span className="text-sm font-bold text-white">Action: {alert.action}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FounderAlerts;
