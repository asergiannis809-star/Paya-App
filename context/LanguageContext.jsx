import { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import useUserSettings from '../hooks/useUserSettings'
import { setLanguage, t } from '../i18n'

const STORAGE_KEY = 'paya.language'

const LanguageContext = createContext({ lang: 'en', t, ready: true })

// Applies the user's Language setting (Settings → Language) to the whole app.
// Cached on the device so the app (and the sign-in screen) opens in the right language.
export function LanguageProvider({ children }) {
  const { settings, loaded } = useUserSettings()
  const [cached, setCached] = useState(null) // null = not read yet

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => setCached(v || 'en'))
      .catch(() => setCached('en'))
  }, [])

  const lang = loaded ? settings.language : cached ?? 'en'

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, settings.language).catch(() => {})
  }, [loaded, settings.language])

  // Set before children render so plain helpers that call t() use the right language.
  setLanguage(lang)

  return (
    <LanguageContext.Provider value={{ lang, t, ready: loaded || cached !== null }}>
      {children}
    </LanguageContext.Provider>
  )
}

// Components call this (instead of importing t directly) so they re-render on a language change.
export const useT = () => useContext(LanguageContext)
