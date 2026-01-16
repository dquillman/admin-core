import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, query, serverTimestamp } from 'firebase/firestore';
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
                        if (user.email === bootstrapEmail) {
                            // Check if any admins exist

                            // This is a simplified check. Real bootstrap usually checks for ANY user with role === 'admin'
                            // but for MVP, if the users collection is small or we check a specific 'config' doc it's better.
                            // Let's check for any admin.
                            const adminsSnapshot = await getDocs(query(collection(db, 'users')));
                            const hasAdmin = adminsSnapshot.docs.some(doc => doc.data().role === 'admin');

                            if (!hasAdmin) {
                                role = 'admin';
                                // Create user doc with admin role
                                await setDoc(doc(db, 'users', user.uid), {
                                    email: user.email,
                                    role: 'admin',
                                    createdAt: serverTimestamp(),
                                    isBootstrapAdmin: true
                                });

                                // Write audit log
                                await setDoc(doc(db, 'admin_audit', `bootstrap_${Date.now()}`), {
                                    adminUid: user.uid,
                                    action: 'bootstrap_admin',
                                    timestamp: serverTimestamp(),
                                    metadata: { email: user.email }
                                });

                                console.log('User bootstrapped as admin');
                            } else {
                                // Just create normal user doc
                                await setDoc(doc(db, 'users', user.uid), {
                                    email: user.email,
                                    role: 'user',
                                    createdAt: serverTimestamp()
                                });
                            }
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
