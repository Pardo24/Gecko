import { createContext, useState, useContext, type ReactNode } from 'react';
import { tr, type Lang, type Tr } from './i18n';

type LangCtx = { lang: Lang; setLang: (l: Lang) => void; t: Tr };

// Default no-op setLang — only used before <LangProvider> mounts.
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};
const LangContext = createContext<LangCtx>({ lang: 'en', setLang: noop, t: tr.en });

/**
 * Pick the initial language: stored preference wins; otherwise detect from
 * the browser's locale; English is the global default fallback (Gecko's
 * primary audience is international).
 */
function detectInitialLang(): Lang {
  const stored = localStorage.getItem('lang') as Lang;
  if (stored === 'ca' || stored === 'es' || stored === 'en') return stored;
  const browser = (navigator.language || 'en').split('-')[0].toLowerCase();
  if (browser === 'ca' || browser === 'es') return browser as Lang;
  return 'en';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('lang', l);
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t: tr[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useT() {
  return useContext(LangContext);
}
