import React, { createContext, useContext, useState, useEffect } from 'react';

interface AppContextType {
    appId: string;
    setAppId: (id: string) => void;
    availableApps: string[];
    addAvailableApp: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_APP_ID = 'examcoachpro';
const STORAGE_KEY_APP_ID = 'admin_core_app_id';
const STORAGE_KEY_AVAILABLE_APPS = 'admin_core_available_apps';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [appId, setAppIdState] = useState<string>(() => {
        // 1. Check URL query
        const urlParams = new URLSearchParams(window.location.search);
        const queryAppId = urlParams.get('appId');
        if (queryAppId) return queryAppId;

        // 2. Check localStorage
        const storedAppId = localStorage.getItem(STORAGE_KEY_APP_ID);
        if (storedAppId) return storedAppId;

        return DEFAULT_APP_ID;
    });

    const [availableApps, setAvailableApps] = useState<string[]>(() => {
        const storedApps = localStorage.getItem(STORAGE_KEY_AVAILABLE_APPS);
        if (storedApps) {
            try {
                return JSON.parse(storedApps);
            } catch (e) {
                console.error("Failed to parse available apps", e);
            }
        }
        return ["examcoachpro", "deadline-shield", "machine-tracker"];
    });

    const setAppId = (id: string) => {
        setAppIdState(id);
        localStorage.setItem(STORAGE_KEY_APP_ID, id);

        // Update URL without refreshing the page
        const url = new URL(window.location.href);
        url.searchParams.set('appId', id);
        window.history.pushState({}, '', url.toString());
    };

    const addAvailableApp = (id: string) => {
        if (!availableApps.includes(id)) {
            const newApps = [...availableApps, id];
            setAvailableApps(newApps);
            localStorage.setItem(STORAGE_KEY_AVAILABLE_APPS, JSON.stringify(newApps));
        }
    };

    useEffect(() => {
        // Sync appId when URL changes (e.g. browser back button)
        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search);
            const id = params.get('appId');
            if (id && id !== appId) {
                setAppIdState(id);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [appId]);

    return (
        <AppContext.Provider value={{ appId, setAppId, availableApps, addAvailableApp }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
