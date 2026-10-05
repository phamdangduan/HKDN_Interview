import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Lang, Localized } from '@/types'
import { DEFAULT_LANG, dictionaries, interpolate } from './strings'
import type { StringKey } from './strings'

type TParams = Record<string, string | number>

interface I18nContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  toggleLang: () => void
  t: (key: StringKey, params?: TParams) => string
  pick: (value: Localized) => string
  speechLang: string
}

const I18nContext = createContext<I18nContextValue | null>(null)

const STORAGE_KEY = 'i68-lang'

const SPEECH: Record<Lang, string> = { vi: 'vi-VN', en: 'en-US' }

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return DEFAULT_LANG
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      return stored === 'en' || stored === 'vi' ? stored : DEFAULT_LANG
    } catch {
      return DEFAULT_LANG
    }
  })

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      window.localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* bỏ qua */
    }
  }, [lang])

  const t = useCallback(
    (key: StringKey, params?: TParams) => {
      const template = dictionaries[lang][key] ?? dictionaries.en[key] ?? key
      return params ? interpolate(template, params) : template
    },
    [lang]
  )

  const pick = useCallback((value: Localized) => value[lang] ?? value.en, [lang])

  const toggleLang = useCallback(() => setLang((prev) => (prev === 'vi' ? 'en' : 'vi')), [])

  const value = useMemo<I18nContextValue>(
    () => ({ lang, setLang, toggleLang, t, pick, speechLang: SPEECH[lang] }),
    [lang, t, pick, toggleLang]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n phải nằm trong I18nProvider')
  return ctx
}