import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useApp } from '../context/AppContext';
import { getLegacyAdminConfig, getAppConfig, logAdminAction } from '../services/firestoreService';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const useMigration = () => {
    const { isAdmin, user } = useAuth();
    const { appId } = useApp();

    useEffect(() => {
        const migrateConfig = async () => {
            if (!isAdmin || !user || !appId) return;

            try {
                // Check if new config exists
                const newConfig = await getAppConfig(appId, 'plans');

                if (!newConfig) {
                    // Check if legacy config exists
                    const legacyConfig = await getLegacyAdminConfig('plans');

                    if (legacyConfig) {
                        console.log(`Migrating legacy config to ${appId}...`);

                        // Copy to new location
                        // We use setDoc directly to ensure it works even if updateAppConfig has more checks
                        await setDoc(doc(db, 'apps', appId, 'config', 'plans'), legacyConfig);

                        // Log audit event
                        await logAdminAction(appId, 'migration_config_plans', 'system', {
                            source: 'admin_config/plans',
                            target: `apps/${appId}/config/plans`
                        });

                        console.log(`Migration successful for ${appId}`);
                    }
                }
            } catch (error) {
                console.error("Migration error:", error);
            }
        };

        migrateConfig();
    }, [isAdmin, user, appId]);
};
