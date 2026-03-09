import { Hand, FileText, CheckSquare, Play, ExternalLink } from 'lucide-react';
import type { OnboardingStepType } from '../../types';

interface StepTypeSelectorProps {
    onSelect: (type: OnboardingStepType) => void;
    onCancel: () => void;
}

const stepTypes: { type: OnboardingStepType; label: string; description: string; icon: React.ElementType }[] = [
    { type: 'welcome', label: 'Welcome', description: 'Greeting screen with title and message', icon: Hand },
    { type: 'form', label: 'Form', description: 'Collect user information with input fields', icon: FileText },
    { type: 'checklist', label: 'Checklist', description: 'Interactive task checklist for setup steps', icon: CheckSquare },
    { type: 'video', label: 'Video', description: 'Embed a tutorial or intro video', icon: Play },
    { type: 'redirect', label: 'Redirect', description: 'Navigate user to a URL on completion', icon: ExternalLink },
];

export default function StepTypeSelector({ onSelect, onCancel }: StepTypeSelectorProps) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Choose Step Type</h3>
                <button onClick={onCancel} className="text-slate-500 hover:text-slate-300 text-sm">Cancel</button>
            </div>
            <div className="grid grid-cols-1 gap-2">
                {stepTypes.map(({ type, label, description, icon: Icon }) => (
                    <button
                        key={type}
                        onClick={() => onSelect(type)}
                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-brand-500/30 hover:bg-slate-800 transition-all text-left"
                    >
                        <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center text-brand-400 shrink-0">
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">{label}</p>
                            <p className="text-xs text-slate-500">{description}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
