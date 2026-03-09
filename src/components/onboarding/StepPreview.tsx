import { CheckSquare, Square, ExternalLink } from 'lucide-react';
import type { OnboardingStep } from '../../types';

interface StepPreviewProps {
    step: OnboardingStep;
}

export default function StepPreview({ step }: StepPreviewProps) {
    return (
        <div className="bg-white rounded-xl p-6 text-slate-900 min-h-[300px] flex flex-col">
            {step.type === 'welcome' && (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                    <h2 className="text-2xl font-bold">{step.config.heading || step.title || 'Welcome!'}</h2>
                    <p className="text-slate-500 max-w-sm">{step.config.message || 'Your welcome message here...'}</p>
                    <button className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium">
                        {step.config.buttonText || 'Get Started'}
                    </button>
                </div>
            )}

            {step.type === 'form' && (
                <div className="flex-1 space-y-4">
                    <h2 className="text-lg font-bold">{step.title || 'Tell us about yourself'}</h2>
                    {(step.config.fieldsRaw || '').split('\n').filter(Boolean).map((line: string, i: number) => {
                        const [label, type] = line.split('|');
                        const isSelect = type?.startsWith('select:');
                        return (
                            <div key={i}>
                                <label className="block text-sm font-medium text-slate-600 mb-1">{label?.trim() || `Field ${i + 1}`}</label>
                                {isSelect ? (
                                    <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50">
                                        <option value="">Select...</option>
                                        {type.replace('select:', '').split(',').map((opt: string) => (
                                            <option key={opt}>{opt.trim()}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input type={type?.trim() || 'text'} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50" placeholder={label?.trim()} />
                                )}
                            </div>
                        );
                    })}
                    <button className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium">
                        {step.config.submitText || 'Continue'}
                    </button>
                </div>
            )}

            {step.type === 'checklist' && (
                <div className="flex-1 space-y-4">
                    <h2 className="text-lg font-bold">{step.title || 'Getting started checklist'}</h2>
                    <div className="space-y-2">
                        {(step.config.itemsRaw || '').split('\n').filter(Boolean).map((item: string, i: number) => (
                            <div key={i} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
                                {i === 0 ? (
                                    <CheckSquare className="w-5 h-5 text-blue-600 shrink-0" />
                                ) : (
                                    <Square className="w-5 h-5 text-slate-300 shrink-0" />
                                )}
                                <span className={`text-sm ${i === 0 ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                    {item.trim()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {step.type === 'video' && (
                <div className="flex-1 space-y-4">
                    <h2 className="text-lg font-bold">{step.title || 'Watch this quick video'}</h2>
                    {step.config.videoUrl ? (
                        <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden">
                            <iframe
                                src={step.config.videoUrl}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    ) : (
                        <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
                            <p className="text-slate-400 text-sm">Enter a video URL to preview</p>
                        </div>
                    )}
                    {step.config.caption && <p className="text-sm text-slate-500 text-center">{step.config.caption}</p>}
                </div>
            )}

            {step.type === 'redirect' && (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                        <ExternalLink className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold">{step.config.message || "You're all set!"}</h2>
                    <p className="text-slate-500 text-sm">
                        Redirecting to {step.config.url || '...'} in {step.config.delay ?? 3}s
                    </p>
                    <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full w-2/3" />
                    </div>
                </div>
            )}
        </div>
    );
}
