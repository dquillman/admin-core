import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { OnboardingStep } from '../../types';
import StepPreview from './StepPreview';

interface FlowPreviewProps {
    steps: OnboardingStep[];
}

export default function FlowPreview({ steps }: FlowPreviewProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (steps.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                Add steps to preview your flow
            </div>
        );
    }

    const step = steps[currentIndex];

    return (
        <div className="flex flex-col h-full">
            {/* Phone frame */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-[360px] bg-slate-950 rounded-[2.5rem] p-3 shadow-2xl border border-slate-700">
                    {/* Notch */}
                    <div className="w-24 h-5 bg-slate-950 rounded-full mx-auto mb-1" />
                    {/* Screen */}
                    <div className="bg-white rounded-[2rem] overflow-hidden" style={{ minHeight: 520 }}>
                        {/* Progress bar */}
                        <div className="h-1 bg-slate-100">
                            <div
                                className="h-full bg-blue-600 transition-all duration-300"
                                style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
                            />
                        </div>
                        <div className="p-4">
                            <StepPreview step={step} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
                <button
                    onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                </button>
                <span className="text-xs text-slate-500 font-mono">
                    {currentIndex + 1} / {steps.length}
                </span>
                <button
                    onClick={() => setCurrentIndex(Math.min(steps.length - 1, currentIndex + 1))}
                    disabled={currentIndex === steps.length - 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    Next
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
