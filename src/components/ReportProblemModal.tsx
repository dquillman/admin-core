import React, { useState } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { createIssue } from '../services/firestoreService';
import { APP_OPTIONS } from '../constants';
import type { AppKey } from '../constants';

interface ReportProblemModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ReportProblemModal: React.FC<ReportProblemModalProps> = ({ isOpen, onClose }) => {
    const [app, setApp] = useState(APP_OPTIONS[0].value);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError('Title is required');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await createIssue({
                app,
                title: title.trim(),
                description: description.trim() || undefined,
            });

            // Reset and close
            setTitle('');
            setDescription('');
            setApp(APP_OPTIONS[0].value);
            onClose();
        } catch (err) {
            console.error('Failed to create issue:', err);
            setError('Failed to create issue. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const selectedApp = APP_OPTIONS.find(a => a.value === app);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-400" />
                        <h2 className="text-lg font-bold text-white">Report a Problem</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* App Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">
                            App
                        </label>
                        <select
                            value={app}
                            onChange={(e) => setApp(e.target.value as AppKey)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-brand-500 focus:outline-none"
                        >
                            {APP_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-slate-500">
                            Issue will be assigned: <span className="text-brand-400 font-mono">{selectedApp?.prefix}-###</span>
                        </p>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">
                            Title <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Brief description of the issue"
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">
                            Description <span className="text-slate-500 text-xs">(optional)</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Additional context, steps to reproduce, etc."
                            rows={3}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none resize-none"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !title.trim()}
                            className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Create Issue
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReportProblemModal;
