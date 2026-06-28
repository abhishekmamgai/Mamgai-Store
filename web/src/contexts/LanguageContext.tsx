"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { dictionaries, Language, DictionaryKey } from "@/i18n/dictionaries";
import { updateLanguagePreference } from "@/lib/actions/language";

interface LanguageContextType {
  language: Language;
  t: (key: DictionaryKey) => string;
  setLanguage: (lang: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({
  children,
  initialLanguage = "en",
}: {
  children: ReactNode;
  initialLanguage?: Language;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  const t = (key: DictionaryKey): string => {
    return dictionaries[language][key] || dictionaries.en[key] || key;
  };

  const setLanguage = async (newLang: Language) => {
    setLanguageState(newLang);
    await updateLanguagePreference(newLang);
  };

  return (
    <LanguageContext.Provider value={{ language, t, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
