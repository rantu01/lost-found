import { initializeApp, getApps } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

if (!getApps().length) {
  initializeApp(firebaseConfig)
}

const auth = getAuth()
const googleProvider = new GoogleAuthProvider()

async function syncUserToMongo(user, role) {
  if (!user?.email) return

  await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      photoURL: user.photoURL || '',
      role: role || 'user',
    }),
  })
}

export const signInWithGooglePopup = async () => {
  const credential = await signInWithPopup(auth, googleProvider)
  await syncUserToMongo(credential.user, credential.user?.email?.toLowerCase() === 'admin@admin.com' ? 'admin' : 'user')
  return credential
}

export const signUpWithEmail = async (email, password) => {
  const credential = await firebaseCreateUserWithEmailAndPassword(auth, email, password)
  await syncUserToMongo(credential.user, 'user')
  return credential
}

export const signInWithEmail = async (email, password) => {
  const credential = await firebaseSignInWithEmailAndPassword(auth, email, password)
  await syncUserToMongo(credential.user, credential.user?.email?.toLowerCase() === 'admin@admin.com' ? 'admin' : 'user')
  return credential
}
export const signOutUser = () => firebaseSignOut(auth)

export default auth
