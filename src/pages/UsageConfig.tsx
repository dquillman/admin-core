import React, { useState, useEffect } from 'react';
import { getUsageScoringConfig, updateUsageScoringConfig } from '../services/firestoreService';
import { Settings, Loader2, Save } from 'lucide-react';

interface UsageScoringForm {
    windowDays: number;
    activeDayPoints: number;
    coreActionPoints: number;
    completionPoints: number;
    scoreCap: number;
    bandPowerUser: number;
    bandActive: number;
    bandEngaged: number;
    bandCurious: number;
}

const DEFAULTS: UsageScoringForm = {
    windowDays: 30,
    activeDayPoints: 5,
    coreActionPoints: 2,
    completionPoints: 3,
    scoreCap: 100,
    bandPowerUser: 85,
    bandActive: 60,
    bandEngaged: 30,
    bandCurious: 10,
};

const inputClass =
    'w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 appearance-none';

const labelClass = 'block text-sm font-medium text-slate-400 mb-1';

interface NumberFieldProps {
    label: string;
    field: keyof UsageScoringForm;
    value: number;
    onChange: (field: keyof UsageScoringForm, value: number) => void;
    placeholder?: number;
    hint?: string;
}

const NumberField: React.FC<NumberFieldProps> = ({ label, field, value, onChange, placeholder, hint }) => (
    <div>
        <label className={labelClass}>{label}</label>
        {hint && <p className="text-xs text-slate-500 mb-1">{hint}</p>}
        <input
            type="number"
            className={inputClass}
            value={value}
            placeholder={String(placeholder ?? '')}
            min={0}
            onChange={(e) => onChange(field, Number(e.target.value))}
        />
    </div>
);

const UsageConfigPage: React.FC = () => {
    const [form, setForm] = useState<UsageScoringForm>(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const fetch = async () => {
            setLoading(true);
            try {
                const config = await getUsageScoringConfig();
                if (!cancelled && config) {
                    setForm({
                        windowDays: (config.windowDays as number) ?? DEFAULTS.windowDays,
                        activeDayPoints: (config.activeDayPoints as number) ?? DEFAULTS.activeDayPoints,
                        coreActionPoints: (config.coreActionPoints as number) ?? DEFAULTS.coreActionPoints,
                        completionPoints: (config.completionPoints as number) ?? DEFAULTS.completionPoints,
                        scoreCap: (config.scoreCap as number) ?? DEFAULTS.scoreCap,
                        bandPowerUser: (config.bandPowerUser as number) ?? DEFAULTS.bandPowerUser,
                        bandActive: (config.bandActive as number) ?? DEFAULTS.bandActive,
                        bandEngaged: (config.bandEngaged as number) ?? DEFAULTS.bandEngaged,
                        bandCurious: (config.bandCurious as number) ?? DEFAULTS.bandCurious,
                    });
                }
            } catch (err: unknown) {
                if (!cancelled) setError('Failed to load config: ' + (err instanceof Error ? err.message : 'Unknown error'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetch();
        return () => { cancelled = true; };
    }, []);

    const handleChange = (field: keyof UsageScoringForm, value: number) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setSuccess(null);
        setError(null);
    };

    const handleSave = async () => {
        setSaving(true);
        setSuccess(null);
        setError(null);
        try {
            await updateUsageScoringConfig(form as unknown as Record<string, unknown>);
            setSuccess('Configuration saved successfully.');
        } catch (err: unknown) {
            setError('Failed to save config: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-800 border border-slate-700">
                    <Settings className="w-5 h-5 text-slate-300" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-white leading-tight">Usage Score Config</h1>
                    <p className="text-sm text-slate-400">Configure scoring parameters</p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                    <span className="ml-3 text-slate-400 text-sm">Loading configuration...</span>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Scoring Parameters Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                            Scoring Parameters
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <NumberField
                                label="Window Size (days)"
                                field="windowDays"
                                value={form.windowDays}
                                onChange={handleChange}
                                placeholder={DEFAULTS.windowDays}
                                hint="Rolling window used to calculate the score"
                            />
                            <NumberField
                                label="Active Day Points"
                                field="activeDayPoints"
                                value={form.activeDayPoints}
                                onChange={handleChange}
                                placeholder={DEFAULTS.activeDayPoints}
                                hint="Points awarded per active day in the window"
                            />
                            <NumberField
                                label="Core Action Points"
                                field="coreActionPoints"
                                value={form.coreActionPoints}
                                onChange={handleChange}
                                placeholder={DEFAULTS.coreActionPoints}
                                hint="Points per core action (e.g. quiz started)"
                            />
                            <NumberField
                                label="Completion Points"
                                field="completionPoints"
                                value={form.completionPoints}
                                onChange={handleChange}
                                placeholder={DEFAULTS.completionPoints}
                                hint="Points per completed session or exam"
                            />
                            <NumberField
                                label="Score Cap"
                                field="scoreCap"
                                value={form.scoreCap}
                                onChange={handleChange}
                                placeholder={DEFAULTS.scoreCap}
                                hint="Maximum score a user can achieve"
                            />
                        </div>
                    </div>

                    {/* Band Thresholds Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-1">
                            Band Thresholds
                        </h2>
                        <p className="text-xs text-slate-500 mb-4">
                            Minimum score required to reach each band (inclusive lower bound)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>
                                    Power User min
                                    <span className="ml-2 text-xs text-violet-400 font-normal">Purple band</span>
                                </label>
                                <input
                                    type="number"
                                    className={inputClass}
                                    value={form.bandPowerUser}
                                    placeholder={String(DEFAULTS.bandPowerUser)}
                                    min={0}
                                    onChange={(e) => handleChange('bandPowerUser', Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>
                                    Active min
                                    <span className="ml-2 text-xs text-emerald-400 font-normal">Green band</span>
                                </label>
                                <input
                                    type="number"
                                    className={inputClass}
                                    value={form.bandActive}
                                    placeholder={String(DEFAULTS.bandActive)}
                                    min={0}
                                    onChange={(e) => handleChange('bandActive', Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>
                                    Engaged min
                                    <span className="ml-2 text-xs text-blue-400 font-normal">Blue band</span>
                                </label>
                                <input
                                    type="number"
                                    className={inputClass}
                                    value={form.bandEngaged}
                                    placeholder={String(DEFAULTS.bandEngaged)}
                                    min={0}
                                    onChange={(e) => handleChange('bandEngaged', Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>
                                    Curious min
                                    <span className="ml-2 text-xs text-slate-400 font-normal">Gray band</span>
                                </label>
                                <input
                                    type="number"
                                    className={inputClass}
                                    value={form.bandCurious}
                                    placeholder={String(DEFAULTS.bandCurious)}
                                    min={0}
                                    onChange={(e) => handleChange('bandCurious', Number(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status messages */}
                    {success && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-400 text-sm">
                            {success}
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Save button */}
                    <div className="flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Configuration
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsageConfigPage;
