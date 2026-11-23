import { Platform } from 'react-native'
import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  browserLocalPersistence,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Values come from .env.local (see .env.example).
// Firebase console → Project settings → Your apps → Web app → SDK config.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: 'paya-app-c5996.firebaseapp.com',
  projectId: 'paya-app-c5996',
  storageBucket: 'paya-app-c5996.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
}

// Reuse the app if it already exists (avoids errors on fast refresh).
const isFirstInit = getApps().length === 0
const app = isFirstInit ? initializeApp(firebaseConfig) : getApp()

// Keep users signed in between app restarts.
export const auth = isFirstInit
  ? initializeAuth(app, {
      persistence:
        Platform.OS === 'web'
          ? browserLocalPersistence
          : getReactNativePersistence(AsyncStorage),
    })
  : getAuth(app)

export const db = getFirestore(app)
