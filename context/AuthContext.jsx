import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import { t } from '../i18n'
import { cancelAllReminders } from '../utils/reminders'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    // Fires once on startup (restored session or null) and on every sign in/out.
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setInitializing(false)
    })
    return unsubscribe
  }, [])

  const signIn = (email, password) =>
    signInWithEmailAndPassword(auth, email.trim(), password)

  const signUp = async (email, password) => {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email.trim(), password)
    // Create a profile document for the new user.
    await setDoc(doc(db, 'users', newUser.uid), {
      email: newUser.email,
      createdAt: serverTimestamp(),
    })
    return newUser
  }

  const signOut = async () => {
    // Reminders belong to this account, so don't leave them on the device.
    await cancelAllReminders().catch(() => {})
    return firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, initializing, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

// Turns Firebase error codes into friendly messages.
export function authErrorMessage(error) {
  switch (error?.code) {
    case 'auth/invalid-email':
      return t('auth.errors.invalidEmail')
    case 'auth/missing-password':
      return t('auth.errors.missingPassword')
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return t('auth.errors.wrongCredentials')
    case 'auth/email-already-in-use':
      return t('auth.errors.emailInUse')
    case 'auth/weak-password':
      return t('auth.errors.weakPassword')
    case 'auth/too-many-requests':
      return t('auth.errors.tooManyRequests')
    case 'auth/network-request-failed':
      return t('auth.errors.network')
    case 'auth/operation-not-allowed':
      return t('auth.errors.notEnabled')
    default:
      return t('auth.errors.generic')
  }
}
