import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getFirestore,
  onSnapshot,
  setDoc,
  type DocumentData,
} from "firebase/firestore";

// Public client config — safe to ship. Access is restricted by Firestore
// security rules (each user can only read/write /users/{their uid}).
const firebaseConfig = {
  apiKey: "AIzaSyDa4-AY3zV_R-bNgZI23dKow-fLRMENWe8",
  authDomain: "tehilim-reader.firebaseapp.com",
  projectId: "tehilim-reader",
  storageBucket: "tehilim-reader.firebasestorage.app",
  messagingSenderId: "590001682050",
  appId: "1:590001682050:web:4d2179dfb9d889661ce69b",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export type { User };

export function watchAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export function signInWithGoogle(): Promise<unknown> {
  return signInWithPopup(auth, googleProvider);
}

export function signOutUser(): Promise<void> {
  return signOut(auth);
}

// Subscribe to a user's synced document. Local echoes (our own pending writes)
// are skipped so callers only react to confirmed/remote state.
export function subscribeUserDoc(
  uid: string,
  onData: (data: DocumentData | undefined) => void,
): () => void {
  return onSnapshot(doc(db, "users", uid), (snapshot) => {
    if (snapshot.metadata.hasPendingWrites) {
      return;
    }
    onData(snapshot.exists() ? snapshot.data() : undefined);
  });
}

export function writeUserDoc(uid: string, data: DocumentData): Promise<void> {
  return setDoc(doc(db, "users", uid), data, { merge: true });
}
