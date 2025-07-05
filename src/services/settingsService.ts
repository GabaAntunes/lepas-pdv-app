import { db, isFirebaseConfigured } from '@/lib/firebase';
import type { Settings } from '@/types';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const SETTINGS_DOC_ID = 'main';

// Get settings, with default values if they don't exist
export const getSettings = async (): Promise<Settings> => {
    const defaultSettings: Settings = {
        firstHourRate: 30.00,
        additionalHourRate: 15.00,
        logoUrl: '',
    };

    if (!isFirebaseConfigured || !db) return defaultSettings;
    
    const settingsDocRef = doc(db, 'settings', SETTINGS_DOC_ID);
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
        return { ...defaultSettings, ...docSnap.data() } as Settings;
    } else {
        // If settings doc doesn't exist, create it with defaults
        await setDoc(settingsDocRef, defaultSettings);
        return defaultSettings;
    }
};

// Update settings
export const updateSettings = async (settings: Partial<Omit<Settings, 'id'>>) => {
    if (!isFirebaseConfigured || !db) {
        throw new Error("Firebase is not configured.");
    }
    const settingsDocRef = doc(db, 'settings', SETTINGS_DOC_ID);
    await setDoc(settingsDocRef, settings, { merge: true });
};
