import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { authErrorMessage, useAuth } from '../../context/AuthContext'
import { makeStyles, useTheme } from '../../context/ThemeContext'
import { useT } from '../../context/LanguageContext'
import Logo from '../../components/Logo'


const MODES = [
  { key: 'login', label: 'auth.signIn' },
  { key: 'register', label: 'auth.createAccount' },
]

export default function AuthScreen() {
  const { colors } = useTheme()
  const { t } = useT()
  const styles = useStyles()
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isRegister = mode === 'register'

  const switchMode = (next) => {
    setMode(next)
    setError('')
    setConfirm('')
  }

  const handleSubmit = async () => {
    setError('')
    if (!email.trim() || !password) {
      setError(t('auth.missingFields'))
      return
    }
    if (isRegister && password !== confirm) {
      setError(t('auth.mismatch'))
      return
    }
    setLoading(true)
    try {
      if (isRegister) await signUp(email, password)
      else await signIn(email, password)
      // On success the root layout switches to the dashboard automatically.
    } catch (err) {
      setError(authErrorMessage(err))
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Logo size={72} style={styles.logo} />

          <Text style={styles.title}>
            {isRegister ? t('auth.createAccount') : t('auth.welcomeBack')}
          </Text>
          <Text style={styles.subtitle}>
            {isRegister ? t('auth.registerSubtitle') : t('auth.loginSubtitle')}
          </Text>

          {/* Sign in / Create account switch */}
          <View style={styles.toggle}>
            {MODES.map((m) => {
              const active = m.key === mode
              return (
                <Pressable
                  key={m.key}
                  onPress={() => switchMode(m.key)}
                  style={[styles.toggleItem, active && styles.toggleItemActive]}
                >
                  <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
                    {t(m.label)}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          <Text style={styles.label}>{t('auth.email')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('auth.emailPlaceholder')}
            placeholderTextColor={colors.stone}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />

          <Text style={styles.label}>{t('auth.password')}</Text>
          <TextInput
            style={styles.input}
            placeholder={isRegister ? t('auth.newPasswordPlaceholder') : t('auth.passwordPlaceholder')}
            placeholderTextColor={colors.stone}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            textContentType={isRegister ? 'newPassword' : 'password'}
          />

          {isRegister && (
            <>
              <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('auth.confirmPlaceholder')}
                placeholderTextColor={colors.stone}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
              />
            </>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => [styles.button, (pressed || loading) && styles.pressed]}
          >
            {loading ? (
              <ActivityIndicator color={colors.ivory} />
            ) : (
              <Text style={styles.buttonText}>
                {isRegister ? t('auth.createAccount') : t('auth.signIn')}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const useStyles = makeStyles((c) => ({
  container: {
    flex: 1,
    backgroundColor: c.ivory,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  logo: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    color: c.ink,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: c.stone,
    fontSize: 16,
    marginTop: 6,
    textAlign: 'center',
  },

  // Segmented switch
  toggle: {
    flexDirection: 'row',
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 999,
    padding: 4,
    marginTop: 28,
    marginBottom: 24,
  },
  toggleItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  toggleItemActive: {
    backgroundColor: c.ink,
  },
  toggleText: {
    color: c.stone,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: c.ivory,
    fontWeight: '700',
  },

  // Fields
  label: {
    color: c.stone,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: c.ink,
    marginBottom: 16,
  },
  error: {
    color: c.error,
    fontSize: 14,
    marginBottom: 8,
  },

  // Button
  button: {
    backgroundColor: c.ink,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: c.ivory,
    fontSize: 17,
    fontWeight: '700',
  },
}))
