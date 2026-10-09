import en from './en';
import ua from './ua';
import ru from './ru';

export type Lang = 'en' | 'ua' | 'ru';
export type Dict = typeof en;

export const LANGS: Lang[] = ['en', 'ua', 'ru'];
export const HTML_LANG: Record<Lang, string> = { en: 'en', ua: 'uk', ru: 'ru' };
export const OG_LOCALE: Record<Lang, string> = { en: 'en_US', ua: 'uk_UA', ru: 'ru_RU' };

const dicts: Record<Lang, Dict> = { en, ua, ru };

export function getDict(lang: Lang): Dict {
  return dicts[lang];
}

export function langPath(lang: Lang): '/' | '/ua/' | '/ru/' {
  return lang === 'en' ? '/' : (`/${lang}/` as '/ua/' | '/ru/');
}
