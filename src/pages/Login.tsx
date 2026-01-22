import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Lock, Mail } from 'lucide-react';

const Login: React.FC = () => {
    const { user, loading: authLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/dashboard";

    useEffect(() => {
        if (!authLoading && user) {
            navigate(from, { replace: true });
        }
    }, [user, authLoading, navigate, from]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError("Please enter both email and password.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate(from, { replace: true });
        } catch (err: any) {
            console.error("Login error:", err);
            setError(err.message || "Failed to sign in.");
            setLoading(false);
        }
    };

    const handleGoogleLogin = async (e: React.MouseEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            // navigate is handled by the useEffect observer
        } catch (err: any) {
            console.error("Popup Error:", err);
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/20">
                        <span className="text-white font-bold text-2xl">A</span>
                    </div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight">Admin Core</h1>
                    <p className="text-slate-400 mt-2">Manage Exam Coach AI Platform</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -mr-16 -mt-16"></div>

                    <form onSubmit={handleLogin} className="space-y-6 relative">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                                <span className="text-red-400 mt-0.5">⚠️</span>
                                <p className="text-sm text-red-200">{error}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-slate-500 transition-all outline-none"
                                    placeholder="Email address"
                                    required
                                />
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-slate-500 transition-all outline-none"
                                    placeholder="Password"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-4 rounded-2xl text-white font-bold shadow-lg shadow-blue-600/10 active:scale-[0.98] transition-all"
                        >
                            {loading ? "Signing in..." : "Sign In"}
                        </button>

                        <div className="relative flex items-center gap-4 py-2">
                            <div className="h-[1px] flex-1 bg-slate-800"></div>
                            <span className="text-xs text-slate-600 uppercase font-semibold">Or use</span>
                            <div className="h-[1px] flex-1 bg-slate-800"></div>
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full bg-slate-800 hover:bg-slate-750 disabled:opacity-50 border border-slate-700 py-4 rounded-2xl text-white flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Sign in with Google
                        </button>
                    </form>
                </div>
                <p className="text-center text-slate-600 text-[10px] mt-8 tracking-widest uppercase">Admin Management Console v1.0</p>
            </div>
        </div>
    );
};

export default Login;
