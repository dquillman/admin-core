import { useState, useRef } from 'react';
import { GripVertical, Hand, FileText, CheckSquare, Play, ExternalLink } from 'lucide-react';
import type { OnboardingStep, OnboardingStepType } from '../../types';

interface DragDropListProps {
    steps: OnboardingStep[];
    selectedStepId: string | null;
    onReorder: (steps: OnboardingStep[]) => void;
    onSelect: (stepId: string) => void;
}

const stepIcons: Record<OnboardingStepType, React.ElementType> = {
    welcome: Hand,
    form: FileText,
    checklist: CheckSquare,
    video: Play,
    redirect: ExternalLink,
};

const stepColors: Record<OnboardingStepType, string> = {
    welcome: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    form: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    checklist: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    video: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    redirect: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
};

export default function DragDropList({ steps, selectedStepId, onReorder, onSelect }: DragDropListProps) {
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [overIndex, setOverIndex] = useState<number | null>(null);
    const dragNode = useRef<HTMLDivElement | null>(null);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDragIndex(index);
        dragNode.current = e.currentTarget as HTMLDivElement;
        e.dataTransfer.effectAllowed = 'move';
        // Make the drag image slightly transparent
        setTimeout(() => {
            if (dragNode.current) dragNode.current.style.opacity = '0.4';
        }, 0);
    };

    const handleDragEnd = () => {
        if (dragNode.current) dragNode.current.style.opacity = '1';
        if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
            const reordered = [...steps];
            const [moved] = reordered.splice(dragIndex, 1);
            reordered.splice(overIndex, 0, moved);
            // Update order numbers
            const updated = reordered.map((s, i) => ({ ...s, order: i }));
            onReorder(updated);
        }
        setDragIndex(null);
        setOverIndex(null);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setOverIndex(index);
    };

    return (
        <div className="space-y-2">
            {steps.map((step, index) => {
                const Icon = stepIcons[step.type];
                const isSelected = step.id === selectedStepId;
                const isDragOver = overIndex === index && dragIndex !== null && dragIndex !== index;

                return (
                    <div
                        key={step.id}
                        draggable
                        onDragStart={e => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={e => handleDragOver(e, index)}
                        onClick={() => onSelect(step.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                            isSelected
                                ? 'bg-brand-600/10 border-brand-500/30'
                                : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                        } ${isDragOver ? 'border-t-2 border-t-brand-500' : ''}`}
                    >
                        <div className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400">
                            <GripVertical className="w-4 h-4" />
                        </div>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${stepColors[step.type]}`}>
                            <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{step.title || `Untitled ${step.type}`}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{step.type}</p>
                        </div>
                        <span className="text-[10px] text-slate-600 font-mono">{index + 1}</span>
                    </div>
                );
            })}
        </div>
    );
}
