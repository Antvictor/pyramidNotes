import { createInstance } from 'i18next'
import { describe, expect, it } from 'vitest'
import en from './resources/en'
import zhCN from './resources/zh-CN'

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix]
  return Object.entries(value).flatMap(([key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key
    return flattenKeys(child, next)
  })
}

describe('translation resources', () => {
  it('keep English and Simplified Chinese key sets identical', () => {
    expect(flattenKeys(zhCN).sort()).toEqual(flattenKeys(en).sort())
  })

  it('falls back to English for a missing selected-language key', async () => {
    const instance = createInstance()
    await instance.init({
      resources: {
        en: { translation: { test: { onlyInEnglish: 'English fallback' } } },
        'zh-CN': { translation: { test: {} } },
      },
      lng: 'zh-CN',
      fallbackLng: 'en',
    })
    expect(instance.t('test.onlyInEnglish')).toBe('English fallback')
  })
})
