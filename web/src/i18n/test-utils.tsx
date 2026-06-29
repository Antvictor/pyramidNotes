import type { ReactElement } from 'react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { render, type RenderResult } from '@testing-library/react'
import en from './resources/en'
import zhCN from './resources/zh-CN'

export async function renderWithLanguage(
  ui: ReactElement,
  language: 'en' | 'zh-CN',
): Promise<RenderResult> {
  const instance = createInstance()
  await instance
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        'zh-CN': { translation: zhCN },
      },
      lng: language,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    })

  return render(
    <I18nextProvider i18n={instance}>
      {ui}
    </I18nextProvider>,
  )
}
