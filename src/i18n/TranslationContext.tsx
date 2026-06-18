import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAppLanguage, setAppLanguage } from '../utils/settings';
import { Language, LANGUAGES } from './types';
import en from './translations/en.json';
import zh from './translations/zh.json';

const translations: Record<Language, Record<string, string>> = { en, zh };

interface TranslationContextValue {
  t: (key: string, params?: Record<string, string>) => string;
  language: Language;
  setLanguage: (lang: Language) => void;
  availableLanguages: typeof LANGUAGES;
}

const TranslationContext = createContext<TranslationContextValue>(null!);

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    getAppLanguage().then(setLanguageState).catch(() => {});
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    setAppLanguage(lang);
  };

  const t = (key: string, params?: Record<string, string>): string => {
    let value = translations[language]?.[key] ?? translations.en[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{{${k}}}`, v);
      }
    }
    return value;
  };

  return (
    <TranslationContext.Provider value={{ t, language, setLanguage, availableLanguages: LANGUAGES }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  return useContext(TranslationContext);
}
