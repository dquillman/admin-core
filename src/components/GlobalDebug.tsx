import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const GlobalDebug: React.FC = () => {
    const location = useLocation();
    const { user, loading } = useAuth();
    const [minimized, setMinimized] = useState(false);

    if (import.meta.env.MODE === 'production' && !location.search.includes('debug')) {
        // Option: Only show if ?debug=true, but for this USER we want it ALWAYS.
        // For now, I will enable it always for this specific debug session.
    }

    if (minimized) {
        return (
            <div
                className="fixed bottom-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full shadow-lg z-[9999] cursor-pointer text-xs font-bold"
                onClick={() => setMinimized(false)}
            >
                DEBUG
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 bg-slate-900 border-2 border-red-500 text-slate-200 p-4 rounded-lg shadow-2xl z-[9999] max-w-sm text-xs font-mono opacity-90">
            <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-1">
                <span className="font-bold text-red-400">GLOBAL FORENSICS</span>
                <button onClick={() => setMinimized(true)} className="text-slate-500 hover:text-white">_</button>
            </div>

            <div className="space-y-1">
                <p><span className="text-slate-500">Path:</span> <span className="text-yellow-400">{location.pathname}</span></p>
                <p><span className="text-slate-500">Auth Loading:</span> {String(loading)}</p>
                <p><span className="text-slate-500">User Email:</span> {user?.email || 'null'}</p>
                <p><span className="text-slate-500">User UID:</span> {user?.uid || 'null'}</p>
            </div>
        </div>
    );
};

export default GlobalDebug;
