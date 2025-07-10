// utils/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBFyzlf-koNxxrz9-r3gh0ST6XI8XOnysY",
  authDomain: "smart-light-8acb4.firebaseapp.com",
  databaseURL: "https://smart-light-8acb4-default-rtdb.firebaseio.com",
  projectId: "smart-light-8acb4",
  storageBucket: "smart-light-8acb4.firebasestorage.app",
  messagingSenderId: "1005734154677",
  appId: "1:1005734154677:web:74db73ad0a5f59458409fc",
  measurementId: "G-S5Z7PEV7HZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase services and export them
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;