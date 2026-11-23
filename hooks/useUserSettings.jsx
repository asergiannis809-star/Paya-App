import { createContext, useContext, useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'

export const DEFAULT_SETTINGS = {
  defaultCurrency: 'EUR',
  language: 'en',
  remindersEnabled: true,
  darkMode: false,
}

const SettingsContext = createContext(null)

// Loads the signed-in user's preferences (users/{uid}.settings) once for the whole app.
export function SettingsProvider({ children }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!user) {
      // Signed out: forget the previous account's settings.
      setSettings(DEFAULT_SETTINGS)
      setLoaded(false)
      return
    }
    return onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        setSettings({ ...DEFAULT_SETTINGS, ...(snap.data()?.settings ?? {}) })
        setLoaded(true)
      },
      (err) => {
        console.warn('Failed to load settings', err?.code, err?.message)
        setLoaded(true)
      }
    )
  }, [user])

  // Saves only the changed keys; the snapshot listener updates `settings`.
  const updateSettings = (changes) => {
    setSettings((s) => ({ ...s, ...changes })) // optimistic
    return setDoc(doc(db, 'users', user.uid), { settings: changes }, { merge: true })
  }

  return (
    <SettingsContext.Provider value={{ settings, loaded, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export default function useUserSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useUserSettings must be used inside <SettingsProvider>')
  return ctx
}
