import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Cloud Firestore with specified custom database ID
const dbId = (firebaseConfigJson as { firestoreDatabaseId?: string }).firestoreDatabaseId;
export const db = dbId && dbId !== '(default)'
  ? getFirestore(app, dbId)
  : getFirestore(app);

// Test server connection as per skill instructions
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'site_settings', 'general'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline or connecting...', error.message);
    }
  }
}

testFirestoreConnection().catch(() => {});
