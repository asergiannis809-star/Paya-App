import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { deleteDoc, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../../firebase/config'
import { useAuth } from '../../../context/AuthContext'
import SubscriptionForm from '../../../components/SubscriptionForm'
import { useT } from '../../../context/LanguageContext'
import { firestoreErrorMessage } from '../../../utils/feedback'
import { makeStyles, useTheme } from '../../../context/ThemeContext'

const toDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : null)

export default function EditSubscription() {
  const { colors } = useTheme()
  const styles = useStyles()
  const { t } = useT()
  const { id } = useLocalSearchParams()
  const { user } = useAuth()
  const [initial, setInitial] = useState(null)
  const [error, setError] = useState('')

  const ref = doc(db, 'users', user.uid, 'subscriptions', String(id))

  // Load the subscription once, then fill the form with it.
  useEffect(() => {
    let cancelled = false
    getDoc(ref)
      .then((snap) => {
        if (cancelled) return
        if (!snap.exists()) return setError(t('errors.notFound'))
        const data = snap.data()
        setInitial({
          ...data,
          // Older/hand-made docs may use "Monthly" instead of "monthly".
          cycle: String(data.cycle ?? 'monthly').toLowerCase(),
          firstPaymentDate: toDate(data.firstPaymentDate) ?? toDate(data.nextDate),
          trialEndsAt: toDate(data.trialEndsAt),
        })
      })
      .catch((err) => !cancelled && setError(firestoreErrorMessage(err, 'load')))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user.uid])

  if (error || !initial) {
    return (
      <View style={styles.center}>
        {error ? (
          <>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && { opacity: 0.7 }}>
              <Text style={styles.back}>{t('common.goBack')}</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={colors.ink} />
        )}
      </View>
    )
  }

  return (
    <SubscriptionForm
      title={t('form.editTitle')}
      subtitle={t('form.editSubtitle')}
      submitLabel={t('form.editSubmit')}
      initial={initial}
      onSubmit={(data) => updateDoc(ref, { ...data, updatedAt: serverTimestamp() })}
      onDelete={() => deleteDoc(ref)}
    />
  )
}

const useStyles = makeStyles((c) => ({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.ivory,
    padding: 24,
  },
  error: {
    color: c.error,
    fontSize: 15,
    textAlign: 'center',
  },
  back: {
    color: c.ink,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 16,
  },
}))
