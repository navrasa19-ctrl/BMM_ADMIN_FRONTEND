import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD6P8hD74QDMK6GeDcmNiYuzmaH7fQMx8A",
  authDomain: "bookmymechanik-a3a7d.firebaseapp.com",
  projectId: "bookmymechanik-a3a7d",
  storageBucket: "bookmymechanik-a3a7d.firebasestorage.app",
  messagingSenderId: "563769160516",
  appId: "1:563769160516:web:35815809c8fef11a0d9d11",
  measurementId: "G-VJ4K7ZCHX6",
};

const app = initializeApp(firebaseConfig);

// Core Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Analytics (optional – works only on HTTPS / production)
export const analytics = getAnalytics(app);

export default app;
