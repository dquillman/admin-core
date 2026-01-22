import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export type UserRole = 'admin' | 'user';

interface AuthState {
    user: User | null;
    role: UserRole | null;
    loading: boolean;
    isAdmin: boolean;
}

export const useAuth = () => {
    const [state, setState] = useState<AuthState>({
        user: null,
        role: null,
        loading: true,
        isAdmin: false,
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // 1. Fetch User Doc
                    const userDoc = await getDoc(doc(db, 'users', user.uid));

                    let role: UserRole = 'user';

                    if (userDoc.exists()) {
                        role = userDoc.data()?.role || 'user';
                    } else {
                        // Create basic user doc if missing, but DO NOT grant admin automatically
                        // except maybe for the specific hardcoded bootstrap email if absolutely necessary,
                        // but user asked for boring/stable.
                        // Let's stick to reading. If it doesn't exist, they are a user.
                    }

                    // Check bootstrap ONLY if allowed env var matches and they are not admin yet
                    // This is "healing" logic, which might be okay, but let's keep it simple.
                    const bootstrapEmail = import.meta.env.VITE_ADMIN_BOOTSTRAP_EMAIL;
                    if (user.email === bootstrapEmail && role !== 'admin') {
                        console.warn("Bootstrap user detected without admin role. Run manual bootstrap or check functions.");
                        // Ideally, we don't do writes in the read hook.
                        // But for stability, if this is THE admin, let's just let them in.
                        // No, user said "Login always resolves to a single stable auth state".
                        // Writing to DB changes state.
                        // Let's just READ.
                    }

                    setState({
                        user,
                        role,
                        loading: false,
                        isAdmin: role === 'admin',
                    });

                } catch (error) {
                    console.error("Auth Error:", error);
                    setState({ user, role: 'user', loading: false, isAdmin: false });
                }
            } else {
                setState({ user: null, role: null, loading: false, isAdmin: false });
            }
        });

        return () => unsubscribe();
    }, []);

    const logout = () => signOut(auth);

    return { ...state, logout };
};

