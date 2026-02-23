import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, auth } from '../firebase';
import {
    ArrowLeft,
    Loader2,
    Plus,
    Trash2,
    Pencil,
    X,
    Download,
    Upload,
    Save
} from 'lucide-react';

interface Question {
    id: string;
    stem: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    domain?: string;
    difficulty?: string;
    imageUrl?: string | null;
}

export default function ExamEditor() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const isNew = examId === 'new';

    // Tabs
    const [activeTab, setActiveTab] = useState<'settings' | 'questions'>('settings');

    // Exam Data
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [domains, setDomains] = useState<string[]>(['People', 'Process', 'Business Environment']);
    const [isPublished, setIsPublished] = useState(false);
    const [newDomain, setNewDomain] = useState('');
    const [bankVersion, setBankVersion] = useState('1.0');

    // Questions Data
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);

    // UI States
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [importing, setImporting] = useState(false);

    // Edit State
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());

    // Filter State
    const [filterDomain, setFilterDomain] = useState<string>('All');
    const [filterDifficulty, setFilterDifficulty] = useState<string>('All');

    useEffect(() => {
        if (!isNew && examId) {
            fetchExam(examId);
            fetchQuestions(examId);
        }
    }, [examId, isNew]);

    const fetchExam = async (id: string) => {
        try {
            const docRef = doc(db, 'exams', id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setName(data.name);
                setDescription(data.description);
                setIsPublished(data.isPublished || false);
                if (data.domains && Array.isArray(data.domains)) {
                    setDomains(data.domains);
                }
                setBankVersion(data.bankVersion || '1.0');
            }
        } catch (error) {
            console.error("Error fetching exam:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchQuestions = async (id: string) => {
        setLoadingQuestions(true);
        try {
            const q = query(collection(db, 'questions'), where('examId', '==', id));
            const querySnapshot = await getDocs(q);
            const qs = querySnapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            })) as Question[];
            setQuestions(qs);
        } catch (error) {
            console.error("Error fetching questions:", error);
        } finally {
            setLoadingQuestions(false);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedVersion = bankVersion.trim();
        if (!trimmedVersion) {
            alert('Bank Version cannot be empty.');
            return;
        }
        setSaving(true);
        try {
            const examData = {
                name,
                description,
                domains: domains.filter(d => d.trim() !== ''),
                isPublished,
                updatedAt: new Date(),
                bankVersion: trimmedVersion,
                bankVersionUpdatedAt: serverTimestamp(),
                bankVersionUpdatedBy: auth.currentUser?.uid || '',
                ...(isNew && { questionCount: 0 })
            };

            if (isNew) {
                const docRef = await addDoc(collection(db, 'exams'), examData);
                navigate(`/exams/${docRef.id}`, { replace: true });
            } else if (examId) {
                await setDoc(doc(db, 'exams', examId), examData, { merge: true });
                alert("Settings saved!");
            }
        } catch (error) {
            console.error("Error saving exam:", error);
            alert("Failed to save exam");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteQuestion = async (questionId: string) => {
        if (!window.confirm("Delete this question?")) return;
        try {
            await deleteDoc(doc(db, 'questions', questionId));
            setQuestions(questions.filter(q => q.id !== questionId));
            if (examId) {
                await updateDoc(doc(db, 'exams', examId), { questionCount: increment(-1) });
            }
        } catch (error) {
            console.error("Error deleting question:", error);
            alert("Failed to delete question");
        }
    };

    const handleDeleteAllQuestions = async () => {
        if (!examId) return;
        if (!window.confirm("WARNING: This will delete ALL questions for this exam.")) return;
        if (!window.confirm("Are you absolutely sure? This cannot be undone.")) return;

        try {
            const functions = getFunctions();
            const deleteFn = httpsCallable(functions, 'deleteExamQuestions');
            await deleteFn({ examId });
            alert('All questions deleted successfully.');
            fetchQuestions(examId);
            fetchExam(examId);
        } catch (error) {
            console.error("Error deleting questions:", error);
            alert("Failed to delete questions. Check console.");
        }
    };

    const handleExport = () => {
        const dataStr = JSON.stringify(questions, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `${name.replace(/\s+/g, '_')}_questions.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileReader = new FileReader();
        if (e.target.files && e.target.files[0]) {
            setImporting(true);
            fileReader.readAsText(e.target.files[0], "UTF-8");
            fileReader.onload = async (event) => {
                try {
                    if (event.target?.result && typeof event.target.result === 'string') {
                        const importedQuestions = JSON.parse(event.target.result);
                        if (!Array.isArray(importedQuestions)) throw new Error("Invalid format: Expected array");

                        let count = 0;
                        for (const q of importedQuestions) {
                            if (!q.stem || !q.options || q.correctAnswer === undefined) continue;
                            await addDoc(collection(db, 'questions'), {
                                ...q,
                                examId: examId,
                                importedAt: new Date()
                            });
                            count++;
                        }

                        if (examId) {
                            await updateDoc(doc(db, 'exams', examId), { questionCount: increment(count) });
                        }

                        alert(`Successfully imported ${count} questions!`);
                        if (examId) fetchQuestions(examId);
                    }
                } catch (error) {
                    console.error("Import error:", error);
                    alert("Failed to import. Check JSON format.");
                } finally {
                    setImporting(false);
                    e.target.value = '';
                }
            };
        }
    };

    const handleAddQuestion = () => {
        setEditingQuestion({
            id: 'new_' + Date.now(),
            stem: '',
            options: ['', '', '', ''],
            correctAnswer: 0,
            explanation: '',
            domain: domains[0] || '',
            difficulty: 'Medium',
            imageUrl: ''
        });
    };

    const toggleSelectQuestion = (id: string) => {
        const newSelected = new Set(selectedQuestionIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedQuestionIds(newSelected);
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedQuestionIds.size} questions?`)) return;
        try {
            const batchPromises = Array.from(selectedQuestionIds).map(id => deleteDoc(doc(db, 'questions', id)));
            await Promise.all(batchPromises);
            setQuestions(questions.filter(q => !selectedQuestionIds.has(q.id)));
            if (examId) {
                await updateDoc(doc(db, 'exams', examId), { questionCount: increment(-selectedQuestionIds.size) });
            }
            setSelectedQuestionIds(new Set());
        } catch (error) {
            console.error("Bulk delete failed:", error);
            alert("Failed to delete selection.");
        }
    };

    const handleSaveQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingQuestion) return;

        try {
            if (editingQuestion.id.startsWith('new_')) {
                const { id, ...data } = editingQuestion;
                await addDoc(collection(db, 'questions'), {
                    ...data,
                    examId: examId,
                    createdAt: new Date()
                });
                if (examId) {
                    await updateDoc(doc(db, 'exams', examId), { questionCount: increment(1) });
                }
            } else {
                const { id, ...data } = editingQuestion;
                await setDoc(doc(db, 'questions', id), data, { merge: true });
            }

            if (examId) fetchQuestions(examId);
            setEditingQuestion(null);
        } catch (error) {
            console.error("Error saving question:", error);
            alert("Failed to save question");
        }
    };

    const handleAddDomain = () => {
        const d = newDomain.trim();
        if (d && !domains.includes(d)) {
            setDomains([...domains, d]);
            setNewDomain('');
        }
    };

    const handleRemoveDomain = (domain: string) => {
        setDomains(domains.filter(d => d !== domain));
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
    );

    const filteredQuestions = questions.filter(q => {
        const domainMatch = filterDomain === 'All' || q.domain === filterDomain;
        const difficultyMatch = filterDifficulty === 'All' || (q.difficulty || 'Medium') === filterDifficulty;
        return domainMatch && difficultyMatch;
    });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/exams')}
                        className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            {isNew ? 'Create New Exam' : name || 'Edit Exam'}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${isPublished ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                                {isPublished ? 'Published' : 'Draft'}
                            </span>
                            {!isNew && <span className="text-slate-500 text-sm">{questions.length} questions</span>}
                        </div>
                    </div>
                </div>

                {!isNew && (
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-400">Published</span>
                        <button
                            onClick={() => setIsPublished(!isPublished)}
                            className={`w-12 h-6 rounded-full p-1 transition-colors ${isPublished ? 'bg-brand-500' : 'bg-slate-700'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isPublished ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            {!isNew && (
                <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 w-fit">
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        Settings
                    </button>
                    <button
                        onClick={() => setActiveTab('questions')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'questions' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        Questions ({questions.length})
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">

                {/* SETTINGS TAB */}
                {(activeTab === 'settings' || isNew) && (
                    <form id="exam-settings-form" onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Exam Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. AWS Solutions Architect"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief description of the certification..."
                                rows={4}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bank Version</label>
                            <input
                                type="text"
                                value={bankVersion}
                                onChange={(e) => setBankVersion(e.target.value)}
                                placeholder="e.g. 1.0 or 2.1.3"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all max-w-xs"
                                required
                            />
                        </div>

                        {/* Domains */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Domains</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {domains.map(d => (
                                    <span key={d} className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-sm border border-slate-700">
                                        {d}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveDomain(d)}
                                            className="text-slate-500 hover:text-red-400 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newDomain}
                                    onChange={(e) => setNewDomain(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDomain(); } }}
                                    placeholder="Add domain..."
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddDomain}
                                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-700 transition-all border border-slate-700"
                                >
                                    Add
                                </button>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 px-8 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-500 transition-all shadow-lg shadow-brand-900/20 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {saving ? 'Saving...' : isNew ? 'Create Exam' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                )}

                {/* QUESTIONS TAB */}
                {activeTab === 'questions' && !isNew && (
                    <div className="space-y-6">
                        {/* Toolbar */}
                        <div className="flex flex-wrap justify-between items-center gap-4 pb-6 border-b border-slate-800">
                            <div className="flex flex-wrap gap-2">
                                <select
                                    value={filterDomain}
                                    onChange={(e) => setFilterDomain(e.target.value)}
                                    className="bg-slate-800 text-slate-300 rounded-lg text-sm font-bold px-3 py-2 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                >
                                    <option value="All">All Domains</option>
                                    {domains.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                                <select
                                    value={filterDifficulty}
                                    onChange={(e) => setFilterDifficulty(e.target.value)}
                                    className="bg-slate-800 text-slate-300 rounded-lg text-sm font-bold px-3 py-2 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                >
                                    <option value="All">All Difficulties</option>
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                </select>
                                <button
                                    onClick={handleExport}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-700 transition-all border border-slate-700"
                                >
                                    <Download className="w-4 h-4" />
                                    Export JSON
                                </button>
                                <label className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-700 transition-all border border-slate-700 cursor-pointer">
                                    <Upload className="w-4 h-4" />
                                    {importing ? 'Importing...' : 'Import JSON'}
                                    <input type="file" accept=".json" onChange={handleImport} className="hidden" disabled={importing} />
                                </label>
                                <button
                                    type="button"
                                    onClick={handleDeleteAllQuestions}
                                    className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm font-bold hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete All
                                </button>
                            </div>
                            <button
                                onClick={handleAddQuestion}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-500 transition-all shadow-lg shadow-brand-500/20"
                            >
                                <Plus className="w-4 h-4" />
                                Add Question
                            </button>
                        </div>

                        {/* Bulk Actions */}
                        {selectedQuestionIds.size > 0 && (
                            <div className="bg-brand-900/50 border border-brand-500/30 rounded-xl p-3 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-brand-100 pl-2">{selectedQuestionIds.size} selected</span>
                                    <button onClick={() => setSelectedQuestionIds(new Set())} className="text-xs text-brand-300 hover:text-white">
                                        Clear
                                    </button>
                                </div>
                                <button
                                    onClick={handleBulkDelete}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-300 rounded-lg text-sm font-bold hover:bg-red-500 hover:text-white transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Selected
                                </button>
                            </div>
                        )}

                        {/* Question List */}
                        {loadingQuestions ? (
                            <div className="text-center py-12">
                                <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
                            </div>
                        ) : questions.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
                                No questions found. Import or add one manually.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredQuestions.map((q) => (
                                    <div key={q.id} className={`group flex items-start p-4 rounded-xl border transition-all ${selectedQuestionIds.has(q.id) ? 'bg-brand-900/10 border-brand-500/50' : 'bg-slate-800/30 border-slate-800 hover:border-slate-700'}`}>
                                        <div className="pt-1 pr-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedQuestionIds.has(q.id)}
                                                onChange={() => toggleSelectQuestion(q.id)}
                                                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-brand-600 focus:ring-brand-500 cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-slate-200 text-sm line-clamp-2">{q.stem}</div>
                                            <div className="flex gap-2 mt-2">
                                                {q.domain && <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] border border-slate-700">{q.domain}</span>}
                                                {q.difficulty && <span className={`px-2 py-0.5 rounded text-[10px] border ${q.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : q.difficulty === 'Hard' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>{q.difficulty}</span>}
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
                                            <button
                                                onClick={() => setEditingQuestion(q)}
                                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteQuestion(q.id)}
                                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Question Edit Modal */}
            {editingQuestion && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-white">
                                {editingQuestion.id.startsWith('new_') ? 'Add Question' : 'Edit Question'}
                            </h3>
                            <button onClick={() => setEditingQuestion(null)}>
                                <X className="w-6 h-6 text-slate-400 hover:text-white transition-colors" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveQuestion} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Question Stem</label>
                                <textarea
                                    value={editingQuestion.stem}
                                    onChange={(e) => setEditingQuestion({ ...editingQuestion, stem: e.target.value })}
                                    placeholder="Enter question..."
                                    rows={4}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all resize-none"
                                    required
                                />
                            </div>

                            {/* Image URL */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Image URL (Optional)</label>
                                <input
                                    type="text"
                                    value={editingQuestion.imageUrl || ''}
                                    onChange={(e) => setEditingQuestion({ ...editingQuestion, imageUrl: e.target.value || null })}
                                    placeholder="https://..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Domain</label>
                                    <select
                                        value={editingQuestion.domain || ''}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, domain: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                        required
                                    >
                                        <option value="" disabled>Select Domain</option>
                                        {domains.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Difficulty</label>
                                    <select
                                        value={editingQuestion.difficulty || 'Medium'}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                    >
                                        <option value="Easy">Easy</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Hard">Hard</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Options</label>
                                <div className="space-y-3">
                                    {editingQuestion.options.map((opt, idx) => (
                                        <div key={idx} className="flex gap-3 items-center">
                                            <input
                                                type="radio"
                                                name="correctAnswer"
                                                checked={editingQuestion.correctAnswer === idx}
                                                onChange={() => setEditingQuestion({ ...editingQuestion, correctAnswer: idx })}
                                                className="w-4 h-4 text-brand-600 focus:ring-brand-500 bg-slate-900 border-slate-700"
                                            />
                                            <input
                                                type="text"
                                                value={opt}
                                                onChange={(e) => {
                                                    const newOptions = [...editingQuestion.options];
                                                    newOptions[idx] = e.target.value;
                                                    setEditingQuestion({ ...editingQuestion, options: newOptions });
                                                }}
                                                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 text-sm"
                                                placeholder={`Option ${idx + 1}`}
                                                required
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Explanation</label>
                                <textarea
                                    value={editingQuestion.explanation}
                                    onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                                    placeholder="Explain the correct answer..."
                                    rows={3}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingQuestion(null)}
                                    className="px-4 py-2.5 text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-500 transition-colors"
                                >
                                    Save Question
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
