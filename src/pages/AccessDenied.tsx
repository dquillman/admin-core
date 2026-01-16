import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { ShieldAlert, LogOut } from 'lucide-react';

const AccessDenied: React.FC = () => {
    const { logout } = useAuth();

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full mb-6">
                    <ShieldAlert className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                <p className="text-slate-400 mb-8">
                    You do not have the required permissions to access the Admin Console.
                    Please contact the system administrator if you believe this is an error.
                </p>
                <button
                    onClick={() => logout()}
                    className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out & Return
                </button>
            </div>
        </div>
    );
};

export default AccessDenied;
