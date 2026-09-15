export type Lang = 'kk' | 'ru';

let lang: Lang = 'kk';

const listeners: Array<() => void> = [];

export function getLang(): Lang {
  return lang;
}

export function setLang(next: Lang) {
  if (lang === next) return;
  lang = next;
  listeners.forEach((fn) => fn());
}

export function subscribeLang(fn: () => void): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx > -1) listeners.splice(idx, 1);
  };
}
