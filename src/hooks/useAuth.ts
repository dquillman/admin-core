import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
                    // Check for bootstrap logic
                    const bootstrapEmail = import.meta.env.VITE_ADMIN_BOOTSTRAP_EMAIL;

                    let role: UserRole = 'user';
                    const userDoc = await getDoc(doc(db, 'users', user.uid));

                    if (userDoc.exists()) {
                        role = userDoc.data().role || 'user';
                    } else {
                        // New user, check if we should bootstrap
                        // Bootstrap logic:
                        // Instead of scanning all users (which requires admin permissions we don't have yet),
                        // we strictly trust the environment variable allowlist.

                        if (user.email === bootstrapEmail) {
                            role = 'admin';
                            await setDoc(doc(db, 'users', user.uid), {
                                email: user.email,
                                role: 'admin',
                                createdAt: serverTimestamp(),
                                isBootstrapAdmin: true
                            });
                            // Log audit (blind write, might fail if rules strictly enforce admin, but user doc is set now)
                            try {
                                await setDoc(doc(db, 'admin_audit', `bootstrap_${Date.now()}`), {
                                    adminUid: user.uid,
                                    action: 'bootstrap_admin',
                                    timestamp: serverTimestamp(),
                                    metadata: { email: user.email }
                                });
                            } catch (auditError) {
                                console.warn("Bootstrap audit log failed", auditError);
                            }
                            console.log('User bootstrapped as admin');
                        } else {
                            // Create normal user doc
                            await setDoc(doc(db, 'users', user.uid), {
                                email: user.email,
                                role: 'user',
                                createdAt: serverTimestamp()
                            });
                        }
                    }

                    setState({
                        user,
                        role,
                        loading: false,
                        isAdmin: role === 'admin',
                    });

                    // If logged in but not admin, we might want to sign out or redirect
                    // But we'll handle that in the UI guard
                } catch (error) {
                    console.error("Error in useAuth:", error);
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
