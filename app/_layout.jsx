import { ActivityIndicator, View } from 'react-native'
import { Stack } from 'expo-router'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { ThemeProvider, useTheme } from '../context/ThemeContext'
import { LanguageProvider, useT } from '../context/LanguageContext'
import { SettingsProvider } from '../hooks/useUserSettings'

// The root layout wraps every screen in the app folder.
export default function RootLayout() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ThemeProvider>
          <LanguageProvider>
            <RootNavigator />
          </LanguageProvider>
        </ThemeProvider>
      </SettingsProvider>
    </AuthProvider>
  )
}

function RootNavigator() {
  const { user, initializing } = useAuth()
  const { colors, ready: themeReady } = useTheme()
  const { ready: languageReady } = useT()

  // Wait until Firebase has restored the saved session (and the saved theme/language are known).
  if (initializing || !themeReady || !languageReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ivory }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    )
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ivory } }}>
      <Stack.Screen name="index" />

      {/* Login/register: only when signed out */}
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* App screens: only when signed in */}
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(dashboard)" />
      </Stack.Protected>
    </Stack>
  )
}
