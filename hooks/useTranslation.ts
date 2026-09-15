import { useEffect, useState } from 'react';
import { getLang, setLang as setLangStore, subscribeLang, Lang } from '@/store/languageStore';
import { resources } from '@/locales';

export function useTranslation() {
  const [lang, setLangState] = useState<Lang>(getLang());

  useEffect(() => subscribeLang(() => setLangState(getLang())), []);

  const dict = resources[lang];

  const t = (path: string): string => {
    const parts = path.split('.');
    let cur: any = dict;
    for (const p of parts) {
      cur = cur?.[p];
    }
    return typeof cur === 'string' ? cur : path;
  };

  return { t, lang, setLang: setLangStore };
}

export type { Lang };
