import { Tabs } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useTheme } from '../../../context/ThemeContext'
import { useT } from '../../../context/LanguageContext'

const TABS = [
  { name: 'home', icon: 'home-outline' },
  { name: 'subscriptions', icon: 'albums-outline' },
  { name: 'calendar', icon: 'calendar-clear-outline' },
  { name: 'settings', icon: 'settings-outline' },
]

// Bottom navigation bar for the main app screens.
export default function TabsLayout() {
  const { colors } = useTheme()
  const { t } = useT()
  return (
    <Tabs
      initialRouteName="subscriptions"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.stone,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
        sceneStyle: { backgroundColor: colors.ivory },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(`tabs.${tab.name}`),
            tabBarIcon: ({ color, size }) => <Ionicons name={tab.icon} size={size} color={color} />,
          }}
        />
      ))}
    </Tabs>
  )
}
