import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Save, Plus, Eye, EyeOff } from 'lucide-react';
import { getFlow, createFlow, updateFlow } from '../services/onboardingService';
import type { OnboardingStep, OnboardingStepType, OnboardingFlow } from '../types';
import DragDropList from '../components/onboarding/DragDropList';
import StepEditor from '../components/onboarding/StepEditor';
import StepTypeSelector from '../components/onboarding/StepTypeSelector';
import FlowPreview from '../components/onboarding/FlowPreview';

function generateId() {
    return Math.random().toString(36).substring(2, 10);
}

const defaultConfigs: Record<OnboardingStepType, Record<string, string | number>> = {
    welcome: { heading: 'Welcome!', message: '', buttonText: 'Get Started' },
    form: { fieldsRaw: '', submitText: 'Continue' },
    checklist: { itemsRaw: '' },
    video: { videoUrl: '', caption: '' },
    redirect: { url: '', delay: 3, message: "You're all set!" },
};

export default function FlowBuilder() {
    const { flowId } = useParams();
    const navigate = useNavigate();
    const isNew = !flowId;

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [steps, setSteps] = useState<OnboardingStep[]>([]);
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
    const [showTypeSelector, setShowTypeSelector] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [status, setStatus] = useState<OnboardingFlow['status']>('draft');

    useEffect(() => {
        if (flowId) {
            loadFlow(flowId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flowId]);

    const loadFlow = async (id: string) => {
        try {
            const flow = await getFlow(id);
            if (!flow) {
                alert('Flow not found');
                navigate('/onboarding');
                return;
            }
            setName(flow.name);
            setDescription(flow.description);
            setSteps(flow.steps || []);
            setStatus(flow.status);
            if (flow.steps?.length > 0) {
                setSelectedStepId(flow.steps[0].id);
            }
        } catch (error) {
            console.error('Error loading flow:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = useCallback(async () => {
        if (!name.trim()) {
            alert('Flow name is required.');
            return;
        }
        setSaving(true);
        try {
            if (isNew) {
                const newId = await createFlow(name, description);
                // Save steps immediately after creation
                await updateFlow(newId, { steps });
                navigate(`/onboarding/${newId}`, { replace: true });
            } else {
                await updateFlow(flowId!, { name, description, steps, status });
            }
        } catch (error) {
            console.error('Error saving flow:', error);
            alert('Failed to save flow.');
        } finally {
            setSaving(false);
        }
    }, [name, description, steps, status, flowId, isNew, navigate]);

    const addStep = (type: OnboardingStepType) => {
        const newStep: OnboardingStep = {
            id: generateId(),
            type,
            title: `${type.charAt(0).toUpperCase() + type.slice(1)} Step`,
            config: { ...defaultConfigs[type] },
            order: steps.length,
        };
        setSteps([...steps, newStep]);
        setSelectedStepId(newStep.id);
        setShowTypeSelector(false);
    };

    const updateStep = (updated: OnboardingStep) => {
        setSteps(steps.map(s => s.id === updated.id ? updated : s));
    };

    const deleteStep = (stepId: string) => {
        setSteps(steps.filter(s => s.id !== stepId).map((s, i) => ({ ...s, order: i })));
        if (selectedStepId === stepId) {
            setSelectedStepId(steps.length > 1 ? steps.find(s => s.id !== stepId)?.id ?? null : null);
        }
    };

    const selectedStep = steps.find(s => s.id === selectedStepId) || null;

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/onboarding')}
                        className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            {isNew ? 'Create Flow' : 'Edit Flow'}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                            showPreview
                                ? 'bg-brand-600/10 text-brand-400 border-brand-500/20'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                    >
                        {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        Preview
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition-all shadow-lg shadow-brand-900/20 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save
                    </button>
                </div>
            </div>

            {/* Flow metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">Flow Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 transition-colors"
                        placeholder="e.g. New User Onboarding"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">Description</label>
                    <input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 transition-colors"
                        placeholder="Brief description of this flow"
                    />
                </div>
            </div>

            {/* Main builder area */}
            <div className={`grid gap-6 ${showPreview ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2'}`}>
                {/* Left: Step list */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Steps</h2>
                        <span className="text-[10px] text-slate-500 font-mono">{steps.length} total</span>
                    </div>

                    {steps.length > 0 && (
                        <DragDropList
                            steps={steps}
                            selectedStepId={selectedStepId}
                            onReorder={setSteps}
                            onSelect={setSelectedStepId}
                        />
                    )}

                    {showTypeSelector ? (
                        <StepTypeSelector
                            onSelect={addStep}
                            onCancel={() => setShowTypeSelector(false)}
                        />
                    ) : (
                        <button
                            onClick={() => setShowTypeSelector(true)}
                            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-700 text-slate-400 hover:text-brand-400 hover:border-brand-500/30 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="text-sm font-medium">Add Step</span>
                        </button>
                    )}
                </div>

                {/* Center: Step editor */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
                    {selectedStep ? (
                        <StepEditor
                            step={selectedStep}
                            onChange={updateStep}
                            onDelete={() => deleteStep(selectedStep.id)}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
                            {steps.length === 0
                                ? 'Add your first step to get started'
                                : 'Select a step to edit'
                            }
                        </div>
                    )}
                </div>

                {/* Right: Preview (optional) */}
                {showPreview && (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                        <FlowPreview steps={steps} />
                    </div>
                )}
            </div>
        </div>
    );
}
