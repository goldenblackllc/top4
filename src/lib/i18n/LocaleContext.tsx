'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { type Locale, type TranslationKey, t as translate } from './translations';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, replacements?: Record<string, string>) => string;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
});

const STORAGE_KEY = 'top4-locale';

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const userRef = useRef<User | null>(null);
  const initializedFromServer = useRef(false);

  // Track the current auth user
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      userRef.current = u;
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // 1. Check localStorage first
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved === 'en' || saved === 'es') {
      setLocaleState(saved);
      initializedFromServer.current = true;
      return;
    }

    // 2. Auto-detect from browser language
    const browserLang = navigator.language?.toLowerCase() || '';
    if (browserLang.startsWith('es')) {
      setLocaleState('es');
    }
    initializedFromServer.current = true;
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);

    // Sync to server: update profile + backfill entries
    const user = userRef.current;
    if (user) {
      fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, locale: newLocale }),
      }).catch((err) => {
        console.error('[LocaleContext] Failed to sync locale to server:', err);
      });
    }
  }, []);

  const tFn = useCallback(
    (key: TranslationKey, replacements?: Record<string, string>) =>
      translate(key, locale, replacements),
    [locale]
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: tFn }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
