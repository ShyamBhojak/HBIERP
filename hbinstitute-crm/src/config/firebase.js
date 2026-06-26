/* global __app_id */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, serverTimestamp, deleteField, Timestamp } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// ... your existing firebase initialization config ...


const firebaseConfig = {
  apiKey: "AIzaSyDo2VvRJcBd4PCmrUXIc8Sn2L2OjBTXtvM",
  authDomain: "hbinstitute-crm.firebaseapp.com",
  projectId: "hbinstitute-crm",
  storageBucket: "hbinstitute-crm.firebasestorage.app",
  messagingSenderId: "567509853695",
  appId: "1:567509853695:web:7243bfd1b44a1a9917b3ca",
  measurementId: "G-Z5VFB5SKNN"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const appId = typeof __app_id !== 'undefined' ? __app_id : '1:567509853695:web:7243bfd1b44a1a9917b3ca';
export { serverTimestamp, deleteField, Timestamp };
export const storage = getStorage(app); // Ensure storage is exported alongside auth and db
