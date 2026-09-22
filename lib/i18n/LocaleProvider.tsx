'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LOCALES, messages, type Locale, type Messages } from './messages';

const STORAGE_KEY = 'locale';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'ja',
  setLocale: () => {},
  t: messages.ja,
});

function readStoredLocale(): Locale | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  return LOCALES.includes(stored as Locale) ? (stored as Locale) : null;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // サーバーレンダリング時はlocalStorageを読めないため、既定(ja)で描画してから復元する。
  const [locale, setLocaleState] = useState<Locale>('ja');

  useEffect(() => {
    const stored = readStoredLocale();
    if (stored) {
      // localStorageはクライアントでしか読めないため、hydration後に反映する。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocaleState(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale, t: messages[locale] }),
    [locale, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

/** 画面文言を引くためのショートカット。 */
export function useT(): Messages {
  return useContext(LocaleContext).t;
}

/** `{n}` のような差し込みを置き換える。 */
export function format(template: string, params: Record<string, string | number>): string {
  return Object.entries(params).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template
  );
}
