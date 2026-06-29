import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { resolveLanguage, type SupportedLanguage } from './locale'
import en from './resources/en'
import zhCN from './resources/zh-CN'

export const resources = {
  en: { translation: en },
  'zh-CN': { translation: zhCN },
}

export async function initializeI18n(
  preference: unknown,
  systemLanguages: readonly string[] = navigator.languages,
): Promise<SupportedLanguage> {
  const language = resolveLanguage(preference, systemLanguages)

  if (!i18n.isInitialized) {
    await i18n
      .use(initReactI18next)
      .init({
        resources,
        lng: language,
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
        returnNull: false,
      })
  } else {
    await i18n.changeLanguage(language)
  }

  applyDocumentLanguage(language)
  return language
}

export function applyDocumentLanguage(language: SupportedLanguage): void {
  document.documentElement.lang = language
  document.title = i18n.t('app.title')
}

export default i18n
