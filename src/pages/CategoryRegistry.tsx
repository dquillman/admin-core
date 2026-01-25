import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
    ShieldCheck,
    Plus,
    AlertTriangle,
    CheckCircle2,
    Archive
} from 'lucide-react';
import {
    subscribeToIssueCategories,
    addIssueCategory,
    updateIssueCategory,
    subscribeToReportedIssues
} from '../services/firestoreService';
import type { IssueCategory, ReportedIssue } from '../types';
const CategoryRegistry: React.FC = () => {
    const { isAdmin, loading: authLoading } = useAuth();
    const [categories, setCategories] = useState<IssueCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'registry' | 'promotion' | 'suggestions'>('registry');



    // New Category Form
    const [newId, setNewId] = useState('');
    const [newLabel, setNewLabel] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Promotion Data
    const [suggestions, setSuggestions] = useState<{ term: string; count: number; issueIds: string[] }[]>([]);

    // Suggestion State
    const [suggestionsQueue, setSuggestionsQueue] = useState<{
        issue: ReportedIssue;
        suggestion: any; // SuggestionResult imported dynamically
    }[]>([]);
    const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const unsubscribe = subscribeToIssueCategories((data: IssueCategory[]) => {
            setCategories(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (activeTab === 'promotion') {
            // Subscribe to ALL apps/issues to find uncategorized ones (limit 1000 for breadth)
            const unsubscribe = subscribeToReportedIssues(1000, (issues: ReportedIssue[]) => {
                const uncategorized = issues.filter((i: ReportedIssue) =>
                    (i.type as string) === 'Uncategorized' ||
                    (i.suggestedCategory && i.suggestedCategory.trim().length > 0)
                );

                const map = new Map<string, { count: number; issueIds: string[] }>();

                uncategorized.forEach((issue: ReportedIssue) => {
                    const term = issue.suggestedCategory?.trim() || 'Uncategorized (No Suggestion)';
                    const existing = map.get(term) || { count: 0, issueIds: [] };
                    existing.count++;
                    existing.issueIds.push(issue.id);
                    map.set(term, existing);
                });

                const sorted = Array.from(map.entries())
                    .map(([term, data]) => ({ term, ...data }))
                    .sort((a, b) => b.count - a.count);

                setSuggestions(sorted);
            });
            return () => unsubscribe();
        }
    }, [activeTab]);

    const handleRunSuggestions = async () => {
        setLoading(true);
        try {
            const { analyzeIssue } = await import('../services/suggestionService');
            const { getReportedIssues } = await import('../services/firestoreService');

            // 1. Fetch potential candidates (Uncategorized)
            // 1. Fetch potential candidates (Uncategorized)
            // Fetching 500 to get a good batch
            const issues = await getReportedIssues(500);

            // Handle missing type as Uncategorized or Uncategorized string
            const uncategorized = issues.filter(i => (i.type as string) === 'Uncategorized' || !i.type);

            // 2. Run Analysis
            const results = [];
            for (const issue of uncategorized) {
                const res = analyzeIssue(issue, categories);
                if (res) {
                    results.push({ issue, suggestion: res });
                }
            }

            setSuggestionsQueue(results);
            setActiveTab('suggestions');

            if (results.length === 0) {
                alert("No confident suggestions found for the current uncategorized issues.");
            }
        } catch (err: any) {
            console.error(err);
            alert(`Error running suggestions: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleApplySuggestions = async () => {
        if (selectedIssueIds.size === 0) return;
        if (!window.confirm(`Apply category updates to ${selectedIssueIds.size} issues? This cannot be easily undone.`)) return;

        setIsSubmitting(true);
        try {
            const { updateIssueDetails } = await import('../services/firestoreService');

            // Process in parallel (limited by browser connection limit, but usually fine for batch of < 50)
            // If massive, we'd want to chunk this. Assuming triage usage is reasonably frequent.
            const updates = suggestionsQueue
                .filter(item => selectedIssueIds.has(item.issue.id))
                .map(item => updateIssueDetails(item.issue.id, { type: item.suggestion.categoryId }));

            await Promise.all(updates);

            // Remove processed items from queue
            setSuggestionsQueue(prev => prev.filter(item => !selectedIssueIds.has(item.issue.id)));
            setSelectedIssueIds(new Set()); // Reset selection

            alert("Issues updated successfully.");
        } catch (err: any) {
            alert(`Error applying updates: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSelect = (id: string) => {
        const newSet = new Set(selectedIssueIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIssueIds(newSet);
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            if (!newId.trim() || !newLabel.trim()) throw new Error("ID and Label are required");

            await addIssueCategory({
                id: newId,
                label: newLabel,
                description: newDesc,
                status: 'active'
            });

            // Reset
            setNewId('');
            setNewLabel('');
            setNewDesc('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeprecate = async (id: string, currentStatus: string) => {
        if (!window.confirm(`Are you sure you want to ${currentStatus === 'active' ? 'deprecate' : 'reactivate'} this category?`)) return;
        try {
            await updateIssueCategory(id, {
                status: currentStatus === 'active' ? 'deprecated' : 'active'
            });
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handlePromote = (term: string) => {
        if (term === 'Uncategorized (No Suggestion)') return;
        setNewId(term.toLowerCase().replace(/[^a-z0-9-_]/g, '-'));
        setNewLabel(term);
        setNewDesc(`Promoted from user suggestions`);
        setActiveTab('registry');
    };

    if (!isAdmin && !authLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-slate-700 shadow-2xl">
                    <ShieldCheck className="w-10 h-10 text-slate-500" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Access Restricted</h1>
                <p className="text-slate-400 max-w-md text-lg leading-relaxed">
                    This area is restricted to administrators only. <br />
                    Please contact a system administrator if you believe this is an error.
                </p>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Issue Categories</h1>
                    <p className="text-slate-400 mt-2">Manage the registry of allowed issue types.</p>
                </div>
                <div className="flex bg-slate-800 p-1 rounded-lg gap-1">
                    {isAdmin && (
                        <>
                            <button
                                onClick={async () => {
                                    if (!window.confirm('Seed default categories? Existing categories will remain unchanged.')) return;
                                    try {
                                        setLoading(true);
                                        const { seedDefaultCategories } = await import('../services/firestoreService');
                                        const count = await seedDefaultCategories();
                                        alert(`Seeding complete. Added ${count} new categories.`);
                                    } catch (err: any) {
                                        alert(`Error seeding: ${err.message}`);
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                className="px-4 py-2 rounded-md text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-transparent"
                                title="Add default categories if missing"
                            >
                                Seed Defaults
                            </button>
                            <button
                                onClick={handleRunSuggestions}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'suggestions'
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'text-indigo-400 hover:text-indigo-300 hover:bg-slate-700'
                                    }`}
                                title="Analyze uncategorized issues"
                            >
                                Suggest Categories
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => setActiveTab('registry')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'registry'
                            ? 'bg-brand-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Registry
                    </button>
                    <button
                        onClick={() => setActiveTab('promotion')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'promotion'
                            ? 'bg-brand-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Promotion Queue
                    </button>
                </div>
            </div>

            {activeTab === 'registry' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* List */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-950 text-slate-400 font-medium">
                                    <tr>
                                        <th className="p-4">Label / ID</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Description</th>
                                        {isAdmin && <th className="p-4 text-right">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {categories.map((cat) => (
                                        <tr key={cat.id} className="group hover:bg-slate-800/50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-white">{cat.label}</div>
                                                <div className="font-mono text-xs text-slate-500">{cat.id}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${cat.status === 'active'
                                                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                    : 'bg-slate-800 text-slate-500 border-slate-700'
                                                    }`}>
                                                    {cat.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-400 max-w-xs truncate" title={cat.description}>
                                                {cat.description || '-'}
                                            </td>
                                            {isAdmin && (
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => handleDeprecate(cat.id, cat.status)}
                                                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors"
                                                        title={cat.status === 'active' ? 'Deprecate' : 'Reactivate'}
                                                    >
                                                        {cat.status === 'active' ? <Archive className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {!loading && categories.length === 0 && (
                                        <tr>
                                            <td colSpan={isAdmin ? 4 : 3} className="p-8 text-center text-slate-500 italic">No categories found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Add Form - Admin Only */}
                    {isAdmin && (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit sticky top-8">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-brand-400" />
                                Add Category
                            </h3>
                            <form onSubmit={handleAddCategory} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Display Label</label>
                                    <input
                                        type="text"
                                        value={newLabel}
                                        onChange={e => {
                                            setNewLabel(e.target.value);
                                            // Auto-slugify ID if not manually edited yet
                                            if (!newId || newId === newLabel.toLowerCase().replace(/[^a-z0-9-_]/g, '-').slice(0, -1)) {
                                                setNewId(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'));
                                            }
                                        }}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:ring-1 focus:ring-brand-500 outline-none"
                                        placeholder="e.g. User Experience"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID (Slug)</label>
                                    <input
                                        type="text"
                                        value={newId}
                                        onChange={e => setNewId(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300 font-mono text-xs focus:ring-1 focus:ring-brand-500 outline-none"
                                        placeholder="e.g. ux"
                                    />
                                    <p className="text-[10px] text-slate-600 mt-1">Immutable, machine-readable ID.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                    <textarea
                                        value={newDesc}
                                        onChange={e => setNewDesc(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300 text-sm focus:ring-1 focus:ring-brand-500 outline-none h-24 resize-none"
                                        placeholder="What belongs in this category?"
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting || !newId || !newLabel}
                                    className="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                >
                                    {isSubmitting ? 'Saving...' : 'Create Category'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            ) : activeTab === 'suggestions' ? (
                // Suggestions Tab (Triage)
                <div className="space-y-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-6 border-b border-slate-800 bg-slate-950/30 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-white">Suggested Classifications</h3>
                            <p className="text-slate-400 text-sm mt-1">
                                Review AI-assisted suggestions for Uncategorized issues. Select valid suggestions and apply to update.
                            </p>
                        </div>
                        {suggestionsQueue.length > 0 && (
                            <button
                                onClick={handleApplySuggestions}
                                disabled={selectedIssueIds.size === 0 || isSubmitting}
                                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all shadow-lg flex items-center gap-2"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                Apply to {selectedIssueIds.size} Issues
                            </button>
                        )}
                    </div>

                    {suggestionsQueue.length > 0 ? (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-950 text-slate-400 font-medium">
                                    <tr>
                                        <th className="p-4 w-12">
                                            <input
                                                type="checkbox"
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedIssueIds(new Set(suggestionsQueue.map(i => i.issue.id)));
                                                    else setSelectedIssueIds(new Set());
                                                }}
                                                checked={selectedIssueIds.size === suggestionsQueue.length && suggestionsQueue.length > 0}
                                                className="rounded bg-slate-800 border-slate-700 focus:ring-brand-500 text-brand-600"
                                            />
                                        </th>
                                        <th className="p-4">Issue</th>
                                        <th className="p-4">Suggested Category</th>
                                        <th className="p-4">Confidence / Reason</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {suggestionsQueue.map((item) => {
                                        const cat = categories.find(c => c.id === item.suggestion.categoryId);
                                        return (
                                            <tr
                                                key={item.issue.id}
                                                className={`group transition-colors cursor-pointer ${selectedIssueIds.has(item.issue.id) ? 'bg-brand-900/10 hover:bg-brand-900/20' : 'hover:bg-slate-800/50'}`}
                                                onClick={() => handleSelect(item.issue.id)}
                                            >
                                                <td className="p-4" onClick={e => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIssueIds.has(item.issue.id)}
                                                        onChange={() => handleSelect(item.issue.id)}
                                                        className="rounded bg-slate-800 border-slate-700 focus:ring-brand-500 text-brand-600"
                                                    />
                                                </td>
                                                <td className="p-4 max-w-sm">
                                                    <div className="font-medium text-white truncate" title={item.issue.message || item.issue.description || 'No Content'}>
                                                        {item.issue.message || item.issue.description || 'No Content'}
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-mono mt-1">
                                                        {(item.issue as any).displayId || item.issue.id} • {(item.issue.suggestedCategory ? `User suggested: "${item.issue.suggestedCategory}"` : 'No user intent')}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                        {cat?.label || item.suggestion.categoryId}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="h-1.5 w-16 bg-slate-800 rounded-full overflow-hidden">
                                                            <div className="h-full bg-green-500" style={{ width: `${item.suggestion.confidence}%` }}></div>
                                                        </div>
                                                        <span className="text-xs text-slate-400">{item.suggestion.confidence}%</span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 truncate max-w-xs" title={item.suggestion.reasons.join(', ')}>
                                                        Matched: {item.suggestion.reasons.join(', ')}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white">No Suggestions Available</h3>
                            <p className="text-slate-400 mt-2 max-w-md mx-auto">
                                Run the analyzer again or check back later when more uncategorized issues arrive.
                            </p>
                            <button
                                onClick={handleRunSuggestions}
                                className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Re-run Analysis
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                // Promotion Tab
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-slate-800 bg-slate-950/30">
                        <h3 className="text-lg font-bold text-white">Suggested Categories</h3>
                        <p className="text-slate-400 text-sm mt-1">
                            These terms appear in "Uncategorized" issues. Promote them to official categories to standardize data.
                        </p>
                    </div>
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950 text-slate-400 font-medium">
                            <tr>
                                <th className="p-4">Suggested Term</th>
                                <th className="p-4 text-center">Occurrences</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {suggestions.map((item, idx) => (
                                <tr key={idx} className="group hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4 font-medium text-white">{item.term}</td>
                                    <td className="p-4 text-center text-slate-300">{item.count}</td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handlePromote(item.term)}
                                            disabled={item.term === 'Uncategorized (No Suggestion)'}
                                            className="px-3 py-1.5 bg-brand-600/10 hover:bg-brand-600/20 text-brand-400 hover:text-brand-300 border border-brand-500/20 rounded-lg text-xs font-bold uppercase transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            Promote
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {suggestions.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-slate-500 italic">No uncategorized issues or suggestions found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default CategoryRegistry;
