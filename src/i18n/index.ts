/**
 * Runtime i18n (spec §3.8). The UI reads strings from the bundled catalog so the user can
 * override the language in-app (Settings), independent of the browser locale. 'system' falls
 * back to the browser UI language. The manifest still uses chrome.i18n / _locales.
 */
import { MESSAGES, type Locale } from './messages';

export type LocaleSetting = 'system' | Locale;

let active: Locale = resolveSystem();

function resolveSystem(): Locale {
  let lang = 'en';
  try {
    lang = chrome.i18n.getUILanguage();
  } catch {
    lang = (typeof navigator !== 'undefined' ? navigator.language : 'en') || 'en';
  }
  return lang.toLowerCase().startsWith('it') ? 'it' : 'en';
}

export function setLocale(setting: LocaleSetting): void {
  active = setting === 'system' ? resolveSystem() : setting;
}

export function t(key: string): string {
  return MESSAGES[active][key] ?? MESSAGES.en[key] ?? key;
}
