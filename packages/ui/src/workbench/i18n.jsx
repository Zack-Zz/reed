import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createTranslator, loadLocale, normalizeLocale, saveLocale } from './i18n-core.js';

const I18nContext = createContext({
  locale: 'zh-CN',
  t: createTranslator('zh-CN'),
  setLocale() {},
});
export function I18nProvider({ children, initialLocale }) {
  const [locale, updateLocale] = useState(() =>
    initialLocale ? normalizeLocale(initialLocale) : loadLocale(),
  );
  const value = useMemo(
    () => ({
      locale,
      t: createTranslator(locale),
      setLocale: (next) => updateLocale(normalizeLocale(next)),
    }),
    [locale],
  );
  useEffect(() => {
    document.documentElement.lang = locale;
    saveLocale(undefined, locale);
  }, [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export const useI18n = () => useContext(I18nContext);
