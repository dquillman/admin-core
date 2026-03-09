import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { getAppSubscriptionUids } from '../services/firestoreService';
import type { User } from '../types';

export const useAppSubscribers = () => {
    const { appId } = useApp();
    const [subscriberUids, setSubscriberUids] = useState<Set<string> | null>(null);
    const [loading, setLoading] = useState(true);
    const cacheRef = useRef<Record<string, Set<string>>>({});

    const normalizedAppId = appId.replace(/\s+/g, '-');

    useEffect(() => {
        if (cacheRef.current[normalizedAppId]) {
            setSubscriberUids(cacheRef.current[normalizedAppId]);
            setLoading(false);
            return;
        }

        setLoading(true);
        getAppSubscriptionUids(normalizedAppId).then(uids => {
            cacheRef.current[normalizedAppId] = uids;
            setSubscriberUids(uids);
            setLoading(false);
        });
    }, [normalizedAppId]);

    const filterByApp = useCallback((users: User[]): User[] => {
        if (!subscriberUids || subscriberUids.size === 0) return users;
        return users.filter(u => subscriberUids.has(u.uid));
    }, [subscriberUids]);

    const filterByUid = useCallback(<T extends { uid: string }>(items: T[]): T[] => {
        if (!subscriberUids || subscriberUids.size === 0) return items;
        return items.filter(item => subscriberUids.has(item.uid));
    }, [subscriberUids]);

    return { appId: normalizedAppId, filterByApp, filterByUid, subscriberUids, loading: loading };
};
