import { describe, expect, it } from 'vitest'
import { normalizeLanguagePreference, resolveLanguage } from './locale'

describe('resolveLanguage', () => {
  it('honors explicit English over a Chinese system language', () => {
    expect(resolveLanguage('en', ['zh-CN'])).toBe('en')
  })

  it('honors explicit Simplified Chinese', () => {
    expect(resolveLanguage('zh-CN', ['en-US'])).toBe('zh-CN')
  })

  it.each(['zh', 'zh-CN', 'zh-SG', 'zh-Hans'])(
    'maps %s system language to Simplified Chinese',
    (language) => {
      expect(resolveLanguage('system', [language])).toBe('zh-CN')
    },
  )

  it('uses the first supported language in browser preference order', () => {
    expect(resolveLanguage('system', ['fr-FR', 'zh-CN', 'en-US'])).toBe('zh-CN')
  })

  it('falls back to English for unsupported system languages', () => {
    expect(resolveLanguage('system', ['fr-FR', 'de-DE'])).toBe('en')
  })
})

describe('normalizeLanguagePreference', () => {
  it.each(['system', 'zh-CN', 'en'] as const)('keeps %s', (value) => {
    expect(normalizeLanguagePreference(value)).toBe(value)
  })

  it('falls back to system for invalid persisted values', () => {
    expect(normalizeLanguagePreference('zh')).toBe('system')
    expect(normalizeLanguagePreference(undefined)).toBe('system')
  })
})
