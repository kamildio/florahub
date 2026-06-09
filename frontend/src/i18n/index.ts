import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import ru from './locales/ru.json'
import kk from './locales/kk.json'
import en from './locales/en.json'

export const SUPPORTED_LOCALES = [
  { code: 'ru', label: 'Русский', short: 'RU' },
  { code: 'kk', label: 'Қазақша', short: 'ҚАЗ' },
  { code: 'en', label: 'English', short: 'EN' },
] as const

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      kk: { translation: kk },
      en: { translation: en },
    },
    fallbackLng: 'ru',
    supportedLngs: ['ru', 'kk', 'en'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'florahub-locale',
      caches: ['localStorage'],
    },
  })

// Keep <html lang> in sync for accessibility & SEO.
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
})

export default i18n
