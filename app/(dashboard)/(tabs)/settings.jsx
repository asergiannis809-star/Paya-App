import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import Constants from 'expo-constants'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../../../firebase/config'
import { useAuth } from '../../../context/AuthContext'
import useSubscriptions from '../../../hooks/useSubscriptions'
import useUserSettings from '../../../hooks/useUserSettings'
import { OptionSheet } from '../../../components/FormControls'
import { confirmAsync, firestoreErrorMessage, showMessage } from '../../../utils/feedback'
import { CURRENCIES } from '../../../utils/subscriptions'
import { exportFileName, subscriptionsToCsv } from '../../../utils/export/csv'
import { shareCsv } from '../../../utils/export/shareCsv'
import { makeStyles, useTheme } from '../../../context/ThemeContext'
import { useT } from '../../../context/LanguageContext'
import { LANGUAGES } from '../../../i18n'
import useNotificationPermission from '../../../hooks/useNotificationPermission'
import {
  openSystemSettings,
  remindersSupported,
  requestPermission,
} from '../../../utils/reminders'

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({
  value: c.code,
  label: `${c.code} (${c.symbol.trim()})`,
}))

// Language names are always shown in their own language.
const LANGUAGE_OPTIONS = LANGUAGES

const reminderOptions = (t) => [
  { value: true, label: t('settings.remindersOn') },
  { value: false, label: t('settings.remindersOff') },
]

const labelFor = (options, value) => options.find((o) => o.value === value)?.label ?? ''

const SettingsRow = ({ icon, title, subtitle, onPress, right, last, busy }) => {
  const { colors } = useTheme()
  const styles = useStyles()
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || busy}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, !last && styles.rowDivider, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={20} color={colors.ink} style={styles.rowIcon} />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      {busy ? (
        <ActivityIndicator color={colors.stone} />
      ) : (
        // `right` undefined → chevron; null → nothing.
        right === undefined ? (
          <Ionicons name="chevron-forward" size={18} color={colors.stone} />
        ) : (
          right
        )
      )}
    </Pressable>
  )
}

export default function Settings() {
  const { colors } = useTheme()
  const styles = useStyles()
  const { t } = useT()
  const { user, signOut } = useAuth()
  const { settings, updateSettings } = useUserSettings()
  const { subscriptions, loading: subsLoading } = useSubscriptions()
  const [sheet, setSheet] = useState(null) // 'currency' | 'language' | 'reminders' | null
  const [exporting, setExporting] = useState(false)
  const [permission, refreshPermission] = useNotificationPermission()

  const save = async (changes) => {
    try {
      await updateSettings(changes)
    } catch (err) {
      console.warn('Failed to save settings', err?.code, err?.message)
      showMessage(t('settings.couldNotSave'), firestoreErrorMessage(err, 'saveSettings'))
    }
  }

  const offerSystemSettings = async () => {
    const ok = await confirmAsync(
      t('settings.blockedTitle'),
      t('settings.blockedMessage'),
      t('settings.openSettings'),
      false
    )
    if (ok) openSystemSettings()
  }

  const remindersBlocked = remindersSupported && settings.remindersEnabled && permission === 'denied'

  const handleNotificationsRow = () => (remindersBlocked ? offerSystemSettings() : setSheet('reminders'))

  const changeReminders = async (remindersEnabled) => {
    await save({ remindersEnabled })
    if (!remindersEnabled || !remindersSupported || permission === 'granted') return
    // Turning reminders on: ask for permission now, or point to the phone's settings.
    const state = await requestPermission()
    refreshPermission()
    if (state === 'denied') offerSystemSettings()
  }

  const handleAccount = async () => {
    const ok = await confirmAsync(
      t('settings.resetTitle'),
      t('settings.resetMessage', { email: user?.email }),
      t('settings.sendLink')
    )
    if (!ok) return
    try {
      await sendPasswordResetEmail(auth, user.email)
      showMessage(t('settings.resetSentTitle'), t('settings.resetSentMessage', { email: user.email }))
    } catch (err) {
      console.warn('Password reset failed', err?.code, err?.message)
      showMessage(t('settings.resetFailedTitle'), t('settings.resetFailedMessage'))
    }
  }

  const handleExport = async () => {
    if (subscriptions.length === 0) {
      return showMessage(t('settings.nothingToExport'), t('settings.nothingToExportMessage'))
    }
    setExporting(true)
    try {
      await shareCsv(subscriptionsToCsv(subscriptions), exportFileName())
    } catch (err) {
      console.warn('Export failed', err?.message)
      showMessage(t('settings.exportFailed'), err?.message ?? t('common.tryAgain'))
    } finally {
      setExporting(false)
    }
  }

  const handleSignOut = async () => {
    const ok = await confirmAsync(
      t('settings.logOutTitle'),
      t('settings.logOutMessage'),
      t('settings.logOut')
    )
    if (ok) signOut()
  }

  const currencySymbol = CURRENCIES.find((c) => c.code === settings.defaultCurrency)?.symbol.trim()
  const version = Constants.expoConfig?.version ?? '1.0.0'
  const REMINDER_OPTIONS = reminderOptions(t)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <Text style={styles.subtitle}>{t('settings.subtitle')}</Text>

        {/* Account */}
        <Pressable
          onPress={handleAccount}
          accessibilityRole="button"
          accessibilityHint={t('settings.accountHint')}
          style={({ pressed }) => [styles.accountCard, pressed && styles.pressed]}
        >
          <View style={styles.accountAvatar}>
            <Ionicons name="person-outline" size={20} color={colors.heroText} />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.accountTitle}>{t('settings.yourAccount')}</Text>
            <Text style={styles.accountEmail} numberOfLines={1}>{user?.email}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.heroMuted} />
        </Pressable>

        {/* Preferences */}
        <Text style={styles.sectionLabel}>{t('settings.preferences')}</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="cash-outline"
            title={t('settings.defaultCurrency')}
            subtitle={`${settings.defaultCurrency} (${currencySymbol})`}
            onPress={() => setSheet('currency')}
          />
          <SettingsRow
            icon="globe-outline"
            title={t('settings.language')}
            subtitle={labelFor(LANGUAGE_OPTIONS, settings.language)}
            onPress={() => setSheet('language')}
          />
          <SettingsRow
            icon="notifications-outline"
            title={t('settings.notifications')}
            subtitle={
              !remindersSupported
                ? t('settings.remindersUnsupported')
                : remindersBlocked
                  ? t('settings.remindersBlocked')
                  : labelFor(REMINDER_OPTIONS, settings.remindersEnabled)
            }
            onPress={remindersSupported ? handleNotificationsRow : undefined}
            right={remindersSupported ? undefined : null}
          />
          <SettingsRow
            icon="moon-outline"
            title={t('settings.darkMode')}
            subtitle={settings.darkMode ? t('common.on') : t('common.off')}
            last
            right={
              <Switch
                value={settings.darkMode}
                onValueChange={(darkMode) => save({ darkMode })}
                trackColor={{ false: colors.border, true: colors.ink }}
                thumbColor={colors.card}
                ios_backgroundColor={colors.border}
              />
            }
          />
        </View>

        {/* Data */}
        <Text style={styles.sectionLabel}>{t('settings.yourData')}</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="download-outline"
            title={t('settings.exportData')}
            subtitle={t('settings.exportSubtitle')}
            onPress={handleExport}
            busy={exporting || subsLoading}
            last
          />
        </View>

        <Pressable
          onPress={handleSignOut}
          accessibilityRole="button"
          style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>{t('settings.logOut')}</Text>
        </Pressable>

        <Text style={styles.version}>{t('settings.version', { version })}</Text>
      </ScrollView>

      <OptionSheet
        visible={sheet === 'currency'}
        title={t('settings.defaultCurrency')}
        options={CURRENCY_OPTIONS}
        value={settings.defaultCurrency}
        onChange={(defaultCurrency) => save({ defaultCurrency })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'language'}
        title={t('settings.language')}
        options={LANGUAGE_OPTIONS}
        value={settings.language}
        onChange={(language) => save({ language })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'reminders'}
        title={t('settings.notifications')}
        options={REMINDER_OPTIONS}
        value={settings.remindersEnabled}
        onChange={changeReminders}
        onClose={() => setSheet(null)}
      />
    </SafeAreaView>
  )
}

const useStyles = makeStyles((c) => ({
  container: {
    flex: 1,
    backgroundColor: c.ivory,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  title: {
    color: c.ink,
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    color: c.stone,
    fontSize: 14,
    marginTop: 4,
  },

  // Account
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.hero,
    borderWidth: 1,
    borderColor: c.heroBorder,
    borderRadius: 20,
    padding: 16,
    marginTop: 20,
  },
  accountAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: c.heroRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  accountTitle: {
    color: c.heroText,
    fontSize: 16,
    fontWeight: '700',
  },
  accountEmail: {
    color: c.heroMuted,
    fontSize: 13,
    marginTop: 2,
  },

  // Sections
  sectionLabel: {
    color: c.stone,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 10,
  },
  card: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 64,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  rowIcon: {
    marginRight: 14,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    color: c.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  rowSubtitle: {
    color: c.stone,
    fontSize: 13,
    marginTop: 2,
  },

  // Footer
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    marginTop: 20,
    alignSelf: 'flex-start',
  },
  logoutText: {
    color: c.error,
    fontSize: 15,
    fontWeight: '700',
  },
  version: {
    color: c.stone,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
  },
  pressed: {
    opacity: 0.7,
  },
}))
