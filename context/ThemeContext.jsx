import { createContext, useContext, useEffect, useState } from 'react'
import { Appearance, Platform, StyleSheet } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import AsyncStorage from '@react-native-async-storage/async-storage'
import useUserSettings from '../hooks/useUserSettings'
import { DARK, LIGHT } from '../constants/theme'

const STORAGE_KEY = 'paya.darkMode'

const ThemeContext = createContext({ dark: false, colors: LIGHT, ready: true })

// Applies the user's Dark mode setting (Settings → Dark mode) to the whole app.
// The value is also cached on the device so the app opens in the right theme
// before Firestore has loaded, and on the sign-in screen.
export function ThemeProvider({ children }) {
  const { settings, loaded } = useUserSettings()
  const [cached, setCached] = useState(null) // null = not read yet

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => setCached(v === 'true'))
      .catch(() => setCached(false))
  }, [])

  const dark = loaded ? settings.darkMode : !!cached

  // Remember the latest value from Firestore for the next launch.
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, String(settings.darkMode)).catch(() => {})
  }, [loaded, settings.darkMode])

  // Make native UI (alerts, date pickers, keyboards) match the in-app theme.
  useEffect(() => {
    if (Platform.OS !== 'web') Appearance.setColorScheme?.(dark ? 'dark' : 'light')
  }, [dark])

  const value = { dark, colors: dark ? DARK : LIGHT, ready: loaded || cached !== null }

  return (
    <ThemeContext.Provider value={value}>
      {children}
      <StatusBar style={dark ? 'light' : 'dark'} />
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

// Builds a StyleSheet from the active palette, once per theme.
// Usage: const useStyles = makeStyles((c) => ({ title: { color: c.ink } }))
//        ...inside a component: const styles = useStyles()
export function makeStyles(factory) {
  const cache = new Map()
  return function useStyles() {
    const { colors } = useTheme()
    if (!cache.has(colors)) cache.set(colors, StyleSheet.create(factory(colors)))
    return cache.get(colors)
  }
}
