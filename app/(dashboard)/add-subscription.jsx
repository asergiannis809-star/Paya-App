import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'
import SubscriptionForm from '../../components/SubscriptionForm'
import { useT } from '../../context/LanguageContext'

export default function AddSubscription() {
  const { user } = useAuth()
  const { t } = useT()

  const save = (data) =>
    addDoc(collection(db, 'users', user.uid, 'subscriptions'), {
      ...data,
      createdAt: serverTimestamp(),
    })

  return (
    <SubscriptionForm
      title={t('form.addTitle')}
      subtitle={t('form.addSubtitle')}
      submitLabel={t('form.addSubmit')}
      onSubmit={save}
    />
  )
}
