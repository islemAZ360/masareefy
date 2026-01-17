import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, reauthenticateWithPopup } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { UserSettings, Transaction } from "../types";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-FhLE24RSU8GRHE9oWZvm_tkQ4tgIWiQ",
  authDomain: "masareefy-1b4ff.firebaseapp.com",
  projectId: "masareefy-1b4ff",
  storageBucket: "masareefy-1b4ff.firebasestorage.app",
  messagingSenderId: "811782757711",
  appId: "1:811782757711:web:f1d7eb37ee60faa404393a",
  measurementId: "G-JPQRNMHV4P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Auth
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Initialize Firestore
const db = getFirestore(app);

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const reauthenticateUser = async () => {
  try {
    if (auth.currentUser) {
      await reauthenticateWithPopup(auth.currentUser, googleProvider);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Re-authentication failed", error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
  }
};

// --- Firestore Helpers ---

export const saveUserData = async (uid: string, userData: UserSettings, transactions?: Transaction[]) => {
  try {
    await setDoc(doc(db, "users", uid), {
      settings: userData,
      // We store transactions in the same doc for simplicity in this version, 
      // or you could use a subcollection. Storing inside main doc for now to save reads.
      transactions: transactions || [] 
    }, { merge: true });
  } catch (e) {
    console.error("Error saving user data: ", e);
  }
};

export const getUserData = async (uid: string) => {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as { settings: UserSettings, transactions: Transaction[] };
    } else {
      return null;
    }
  } catch (e) {
    console.error("Error fetching user data: ", e);
    return null;
  }
};

export const deleteUserAccount = async (uid: string) => {
  try {
    // 1. Delete Firestore Data
    await deleteDoc(doc(db, "users", uid));

    // 2. Delete Auth User
    const user = auth.currentUser;
    if (user) {
      await user.delete();
    }
  } catch (error) {
    console.error("Error deleting account", error);
    throw error;
  }
};

export { auth, db };