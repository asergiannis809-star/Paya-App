import { useEffect } from 'react'
import { router } from 'expo-router'
import useSubscriptions from './useSubscriptions'
import useUserSettings from './useUserSettings'
import { useT } from '../context/LanguageContext'
import { onReminderTap, syncReminders } from '../utils/reminders'

// Keeps scheduled renewal reminders in step with the user's subscriptions, the
// Settings → Notifications switch and the app language. Mounted once while signed in.
export default function useReminderSync() {
  const { subscriptions, loading } = useSubscriptions()
  const { settings, loaded } = useUserSettings()
  const { lang } = useT()

  useEffect(() => {
    if (loading || !loaded) return
    // Short delay so a burst of changes leads to one reschedule.
    const id = setTimeout(() => syncReminders(subscriptions, settings.remindersEnabled), 400)
    return () => clearTimeout(id)
  }, [subscriptions, settings.remindersEnabled, lang, loading, loaded])

  // Tapping a reminder opens that subscription.
  useEffect(() => onReminderTap((id) => router.push(`/edit-subscription/${id}`)), [])
}
