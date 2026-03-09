import { Trash2 } from 'lucide-react';
import type { OnboardingStep } from '../../types';

interface StepEditorProps {
    step: OnboardingStep;
    onChange: (updated: OnboardingStep) => void;
    onDelete: () => void;
}

export default function StepEditor({ step, onChange, onDelete }: StepEditorProps) {
    const update = (field: string, value: string | number) => {
        onChange({ ...step, config: { ...step.config, [field]: value } });
    };

    const updateTitle = (title: string) => {
        onChange({ ...step, title });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Edit Step</h3>
                <button
                    onClick={onDelete}
                    className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Delete step"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Common: Title */}
            <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Step Title</label>
                <input
                    type="text"
                    value={step.title}
                    onChange={e => updateTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500/50"
                />
            </div>

            {/* Type-specific config */}
            {step.type === 'welcome' && (
                <>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">Heading</label>
                        <input
                            type="text"
                            value={step.config.heading || ''}
                            onChange={e => update('heading', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500/50"
                            placeholder="Welcome aboard!"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">Message</label>
                        <textarea
                            value={step.config.message || ''}
                            onChange={e => update('message', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500/50 resize-none"
                            rows={3}
                            placeholder="We're glad to have you here..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">Button Text</label>
                        <input
                            type="text"
                            value={step.config.buttonText || ''}
                            onChange={e => update('buttonText', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500/50"
                            placeholder="Get Started"
                        />
                    </div>
                </>
            )}

            {step.type === 'form' && (
                <>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">Fields (one per line, format: label|type)</label>
                        <textarea
                            value={step.config.fieldsRaw || ''}
                            onChange={e => update('fieldsRaw', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-brand-500/50 resize-none"
                            rows={4}
                            placeholder={"Full Name|text\nEmail|email\nCompany|text\nRole|select:Engineer,Designer,PM,Other"}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">Submit Button Text</label>
                        <input
                            type="text"
                            value={step.config.submitText || ''}
                            onChange={e => update('submitText', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500/50"
                            placeholder="Continue"
                        />
                    </div>
                </>
            )}

            {step.type === 'checklist' && (
                <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">Checklist Items (one per line)</label>
                    <textarea
                        value={step.config.itemsRaw || ''}
                        onChange={e => update('itemsRaw', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-brand-500/50 resize-none"
                        rows={5}
                        placeholder={"Set up your profile\nConnect your workspace\nInvite team members\nComplete first task"}
                    />
                </div>
            )}

            {step.type === 'video' && (
                <>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">Video URL</label>
                        <input
                            type="url"
                            value={step.config.videoUrl || ''}
                            onChange={e => update('videoUrl', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500/50"
                            placeholder="https://www.youtube.com/embed/..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">Caption</label>
                        <input
                            type="text"
                            value={step.config.caption || ''}
                            onChange={e => update('caption', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500/50"
                            placeholder="Watch this 2-minute intro"
                        />
                    </div>
                </>
            )}

            {step.type === 'redirect' && (
                <>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">Redirect URL</label>
                        <input
                            type="url"
                            value={step.config.url || ''}
                            onChange={e => update('url', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500/50"
                            placeholder="https://app.example.com/dashboard"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">Delay (seconds)</label>
                        <input
                            type="number"
                            value={step.config.delay ?? 3}
                            onChange={e => update('delay', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500/50"
                            min={0}
                            max={30}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">Message</label>
                        <input
                            type="text"
                            value={step.config.message || ''}
                            onChange={e => update('message', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500/50"
                            placeholder="You're all set! Redirecting..."
                        />
                    </div>
                </>
            )}
        </div>
    );
}
