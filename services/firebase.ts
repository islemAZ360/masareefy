import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';

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

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
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

export { auth };