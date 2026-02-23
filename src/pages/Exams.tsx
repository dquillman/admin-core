import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
    Loader2,
    Plus,
    Trash2,
    Pencil,
    Eye,
    EyeOff,
    ClipboardList
} from 'lucide-react';

interface Exam {
    id: string;
    name: string;
    description: string;
    questionCount: number;
    domains?: string[];
    isPublished?: boolean;
    bankVersion?: string;
}

export default function Exams() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'exams'));
            const examsData = querySnapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            })) as Exam[];
            setExams(examsData);
        } catch (error) {
            console.error("Error fetching exams:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteExam = async (examId: string) => {
        if (!window.confirm('Are you sure you want to delete this exam? This action cannot be undone.')) return;
        try {
            await deleteDoc(doc(db, 'exams', examId));
            setExams(exams.filter(e => e.id !== examId));
        } catch (error) {
            console.error("Error deleting exam:", error);
            alert("Failed to delete exam. Check console.");
        }
    };

    const handleTogglePublish = async (exam: Exam) => {
        const newVal = !exam.isPublished;
        try {
            await updateDoc(doc(db, 'exams', exam.id), { isPublished: newVal });
            setExams(exams.map(e => e.id === exam.id ? { ...e, isPublished: newVal } : e));
        } catch (error) {
            console.error("Error toggling publish:", error);
            alert("Failed to update publish status.");
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Exams</h1>
                    <p className="text-slate-400">Manage exams and control visibility</p>
                </div>
                <Link
                    to="/exams/new"
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition-all shadow-lg shadow-brand-900/20"
                >
                    <Plus className="w-5 h-5" />
                    Create New Exam
                </Link>
            </div>

            {/* Exam Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exams.map((exam) => (
                    <div key={exam.id} className="group relative bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-brand-500/30 transition-all duration-300">
                        <div className="space-y-4">
                            {/* Header */}
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-brand-400 border border-slate-700">
                                    <ClipboardList className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-700 uppercase tracking-wider">
                                        {exam.questionCount ?? 0} Items
                                    </span>
                                    <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-500/20 uppercase tracking-wider">
                                        Bank v{exam.bankVersion || '1.0'}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${exam.isPublished
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : 'bg-slate-800 text-slate-500 border-slate-700'
                                        }`}>
                                        {exam.isPublished ? 'Published' : 'Draft'}
                                    </span>
                                </div>
                            </div>

                            {/* Title & Description */}
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1 tracking-tight">{exam.name}</h3>
                                <p className="text-slate-400 text-sm line-clamp-2">{exam.description}</p>
                            </div>

                            {/* Domains */}
                            {exam.domains && exam.domains.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {exam.domains.slice(0, 3).map(d => (
                                        <span key={d} className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] border border-slate-700">{d}</span>
                                    ))}
                                    {exam.domains.length > 3 && (
                                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-500 text-[10px] border border-slate-700">+{exam.domains.length - 3}</span>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 pt-2 border-t border-slate-800">
                                <Link
                                    to={`/exams/${exam.id}`}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-sm font-bold hover:bg-brand-600 hover:text-white transition-all border border-slate-700"
                                >
                                    <Pencil className="w-4 h-4" />
                                    Edit
                                </Link>
                                <button
                                    onClick={() => handleTogglePublish(exam)}
                                    className={`px-3 py-2.5 rounded-xl text-sm font-bold transition-all border ${exam.isPublished
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/20'
                                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'
                                        }`}
                                    title={exam.isPublished ? 'Unpublish' : 'Publish'}
                                >
                                    {exam.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => handleDeleteExam(exam.id)}
                                    className="px-3 py-2.5 bg-slate-800 text-slate-500 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all border border-slate-700"
                                    title="Delete Exam"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {exams.length === 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
                    <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg font-medium">No exams found</p>
                    <p className="text-slate-500 text-sm mt-1">Create your first exam to get started</p>
                </div>
            )}
        </div>
    );
}
