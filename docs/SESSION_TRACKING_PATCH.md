# ExamCoachPro Repo: Tester Activity Patch Plan

This document outlines the changes needed in the **ExamCoachPro web app** repository to support platform-wide session tracking.

## 1. Authentication Integration

**File:** `src/hooks/useAuth.ts` (or your main auth service)

Add these helpers to handle session lifecycle:

```typescript
import { 
    collection, 
    addDoc, 
    updateDoc, 
    doc, 
    serverTimestamp, 
    onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';

// A. On Login Success
export const startUserSession = async (user: any) => {
    const sessionData = {
        userId: user.uid,
        email: user.email,
        app: "examcoachpro",
        loginAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
        logoutAt: null,
        durationSec: null,
        endedBy: null,
        userAgent: navigator.userAgent
    };
    
    const docRef = await addDoc(collection(db, 'user_sessions'), sessionData);
    sessionStorage.setItem('ecp_session_id', docRef.id);
    return docRef.id;
};

// B. On Logout
export const endUserSession = async () => {
    const sessionId = sessionStorage.getItem('ecp_session_id');
    if (!sessionId) return;
    
    await updateDoc(doc(db, 'user_sessions', sessionId), {
        logoutAt: serverTimestamp(),
        endedBy: 'logout'
    });
    
    sessionStorage.removeItem('ecp_session_id');
};
```

## 2. Global Heartbeat Hook

Create a new hook `src/hooks/useSessionHeartbeat.ts`:

```typescript
import { useEffect } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';

export const useSessionHeartbeat = () => {
    const { user } = useAuth();
    
    useEffect(() => {
        if (!user) return;
        
        const updateHeartbeat = async () => {
            const sessionId = sessionStorage.getItem('ecp_session_id');
            if (sessionId) {
                await updateDoc(doc(db, 'user_sessions', sessionId), {
                    lastSeenAt: serverTimestamp()
                });
            }
        };

        // 1. Regular interval (60s)
        const interval = setInterval(updateHeartbeat, 60000);
        
        // 2. Tab Visibility Change
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                updateHeartbeat();
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibility);
        
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [user]);
};
```

**Usage:** Add `useSessionHeartbeat()` to your root `App.tsx` or `Layout.tsx`.

## 3. Scheduled Auto-Close (Cloud Functions)

**File:** `functions/src/sessions.ts` (or similar)

Requires `firebase-functions` and `firebase-admin`.

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Runs every 5 minutes
export const autoCloseSessions = functions.pubsub
    .schedule('every 5 minutes')
    .onRun(async (context) => {
        const db = admin.firestore();
        const now = admin.firestore.Timestamp.now();
        const timeoutThreshold = new Date(now.toDate().getTime() - 15 * 60 * 1000);
        
        const inactiveSessions = await db.collection('user_sessions')
            .where('logoutAt', '==', null)
            .where('lastSeenAt', '<=', timeoutThreshold)
            .get();
            
        const batch = db.batch();
        
        inactiveSessions.forEach(sessionDoc => {
            const data = sessionDoc.data();
            const loginAt = data.loginAt.toDate();
            const lastSeenAt = data.lastSeenAt.toDate();
            
            // We set logoutAt to lastSeenAt for more accurate duration
            const durationSec = Math.round((lastSeenAt.getTime() - loginAt.getTime()) / 1000);
            
            batch.update(sessionDoc.ref, {
                logoutAt: data.lastSeenAt, // Use last heartbeat as logout time
                endedBy: 'timeout',
                durationSec: durationSec
            });
        });
        
        return batch.commit();
    });
```

To deploy:

```bash
firebase deploy --only functions:autoCloseSessions
```
