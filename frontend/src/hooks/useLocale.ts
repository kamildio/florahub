import { useTranslation } from 'react-i18next'
import type { Locale, Localized } from '@/lib/types'

/**
 * Returns the active locale plus a `lz` helper that resolves a Localized
 * value to the current language (falling back to Russian).
 */
export function useLocale() {
  const { i18n } = useTranslation()
  const locale = (i18n.language?.slice(0, 2) as Locale) || 'ru'
  const lz = (value: Localized) => value[locale] ?? value.ru
  const intlLocale = locale === 'kk' ? 'kk-KZ' : locale === 'en' ? 'en-US' : 'ru-RU'
  return { locale, lz, intlLocale }
}
