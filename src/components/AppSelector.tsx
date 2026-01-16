import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronDown, Plus, LayoutGrid, Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const AppSelector: React.FC = () => {
    const { appId, setAppId, availableApps, addAvailableApp } = useApp();
    const [isOpen, setIsOpen] = useState(false);
    const [newAppInput, setNewAppInput] = useState('');
    const [isAddingMode, setIsAddingMode] = useState(false);

    const handleAddApp = (e: React.FormEvent) => {
        e.preventDefault();
        if (newAppInput.trim()) {
            addAvailableApp(newAppInput.trim().toLowerCase());
            setAppId(newAppInput.trim().toLowerCase());
            setNewAppInput('');
            setIsAddingMode(false);
            setIsOpen(false);
        }
    };

    return (
        <div className="relative mb-6">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all group"
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 bg-brand-600/20 rounded-lg flex items-center justify-center shrink-0">
                        <LayoutGrid className="w-4 h-4 text-brand-400" />
                    </div>
                    <div className="text-left overflow-hidden">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active App</p>
                        <p className="text-sm font-bold text-white truncate">{appId}</p>
                    </div>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-20 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-2 space-y-1">
                            {availableApps.map((id) => (
                                <button
                                    key={id}
                                    onClick={() => {
                                        setAppId(id);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-between p-3 rounded-xl transition-all text-sm",
                                        appId === id
                                            ? "bg-brand-600/10 text-brand-400 font-bold"
                                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                                    )}
                                >
                                    {id}
                                    {appId === id && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>

                        <div className="p-2 border-t border-slate-800 bg-slate-800/30">
                            {isAddingMode ? (
                                <form onSubmit={handleAddApp} className="flex gap-2">
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="App ID..."
                                        value={newAppInput}
                                        onChange={(e) => setNewAppInput(e.target.value)}
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                                    />
                                    <button
                                        type="submit"
                                        className="bg-brand-600 text-white p-2 rounded-lg hover:bg-brand-500 transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </form>
                            ) : (
                                <button
                                    onClick={() => setIsAddingMode(true)}
                                    className="w-full flex items-center gap-2 p-2 text-xs text-slate-500 hover:text-slate-300 transition-all"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Custom App
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
