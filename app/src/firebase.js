// ============================================================
// FIREBASE CONFIGURATION
// Replace with your Firebase project settings from:
// https://console.firebase.google.com → Project Settings → Your apps → Web app
// ============================================================
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBauWmhp1vXQQjeRe_P89RSSERWLD8lHfc",
  authDomain: "property-management-3750b.firebaseapp.com",
  projectId: "property-management-3750b",
  storageBucket: "property-management-3750b.firebasestorage.app",
  messagingSenderId: "320590155100",
  appId: "1:320590155100:web:7608fb1ddf4599f14c4599",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
