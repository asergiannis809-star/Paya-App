import { Stack } from 'expo-router'
import { useTheme } from '../../context/ThemeContext'
import useReminderSync from '../../hooks/useReminderSync'

export default function DashboardLayout() {
  const { colors } = useTheme()
  useReminderSync()
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ivory } }}
    />
  )
}
