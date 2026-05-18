import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { translations, Language, TranslationKey } from '../translations';

interface Settings {
  language: Language;
  theme: 'light' | 'dark';
  currency: string;
  currencySymbol: string;
  companyName: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyAddress?: string;
  taxId: string;
  lastBackup?: string;
  autoNotification?: boolean;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  loading: boolean;
  t: (key: TranslationKey) => string;
}

const defaultSettings: Settings = {
  language: 'ar',
  theme: 'light',
  currency: 'USD',
  currencySymbol: '$',
  companyName: 'لوجي-تراك',
  companyPhone: '',
  companyEmail: '',
  companyWebsite: '',
  companyAddress: '',
  taxId: '',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const t = (key: TranslationKey): string => {
    return translations[settings.language][key] || key;
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Settings;
        setSettings(prev => ({ ...prev, ...data }));
        
        // Handle Theme
        if (data.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }

        // Handle Language (RTL/LTR)
        if (data.language === 'ar') {
          document.documentElement.dir = 'rtl';
          document.documentElement.lang = 'ar';
        } else {
          document.documentElement.dir = 'ltr';
          document.documentElement.lang = 'en';
        }
      }
      setLoading(false);
    }, (error) => {
      console.warn("Settings fetch warning (likely missing permissions):", error);
      setLoading(false);
    });

    return unsub;
  }, []);

  const updateSettings = async (newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings };
    await setDoc(doc(db, 'settings', 'general'), updated);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading, t }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
