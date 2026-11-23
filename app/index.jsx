import Spacer from '../components/Spacer';
import Logo from '../components/Logo';
import { Stack, router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { makeStyles, useTheme } from '../context/ThemeContext';
import { useT } from '../context/LanguageContext';

// app/index.jsx is the first screen the app opens (route "/").
export default function StartScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useT();
  const styles = useStyles();

  return (
    <View style={styles.container}>
      {/* Header: the top bar for this screen. */}
      <Stack.Screen
        options={{
          headerShown: false,
          title: 'Paya',
          headerStyle: { backgroundColor: colors.ink },
          headerTintColor: colors.ivory,
          headerTitleStyle: { fontWeight: '700' },
          headerTitleAlign: 'center',
        }}
      />

      {/* "../" because this file is inside the app folder, and assets is one level up. */}
      <Logo size={160} style={styles.logo} />
      <Spacer height={18}></Spacer>

      <Text style={styles.title}>Paya</Text>
      <Text style={styles.text}>{t('start.tagline')}</Text>

      <Pressable
        onPress={() => router.push(user ? '/subscriptions' : '/auth')}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>{t('start.getStarted')}</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  container: {
    flex: 1,
    backgroundColor: c.ivory, // app background
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    marginBottom: 24,
  },
  title: {
    color: c.ink, // headlines
    fontWeight: '700',
    fontSize: 32,
  },
  text: {
    color: c.stone, // secondary text
    fontSize: 18,
    justifyContent: 'center',
    marginHorizontal: 32,
    textAlign: 'center',
    marginTop: 8,
  },
  button: {
    backgroundColor: c.ink, // primary buttons
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 32,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: c.ivory,
    fontSize: 18,
    fontWeight: '700',
  },
}));
