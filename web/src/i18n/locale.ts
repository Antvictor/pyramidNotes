export const LANGUAGE_PREFERENCES = ['system', 'zh-CN', 'en'] as const

export type LanguagePreference = (typeof LANGUAGE_PREFERENCES)[number]
export type SupportedLanguage = Exclude<LanguagePreference, 'system'>

export function normalizeLanguagePreference(
  value: unknown,
): LanguagePreference {
  return LANGUAGE_PREFERENCES.includes(value as LanguagePreference)
    ? (value as LanguagePreference)
    : 'system'
}

function isSimplifiedChinese(language: string): boolean {
  const normalized = language.toLowerCase()
  return normalized === 'zh'
    || normalized.startsWith('zh-cn')
    || normalized.startsWith('zh-sg')
    || normalized.startsWith('zh-hans')
}

export function resolveLanguage(
  preference: unknown,
  systemLanguages: readonly string[],
): SupportedLanguage {
  const normalizedPreference = normalizeLanguagePreference(preference)
  if (normalizedPreference !== 'system') return normalizedPreference

  for (const language of systemLanguages) {
    if (isSimplifiedChinese(language)) return 'zh-CN'
    if (language.toLowerCase().startsWith('en')) return 'en'
  }

  return 'en'
}
