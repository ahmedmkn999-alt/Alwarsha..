// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// بيانات مشروعك الحقيقية التي أرسلتها
const firebaseConfig = {
  apiKey: "AIzaSyAmxDBecXP2bikBqI9PANfcEkCq2s4DXDg",
  authDomain: "alwarsha-cf816.firebaseapp.com",
  databaseURL: "https://alwarsha-cf816-default-rtdb.firebaseio.com",
  projectId: "alwarsha-cf816",
  storageBucket: "alwarsha-cf816.firebasestorage.app",
  messagingSenderId: "787131606543",
  appId: "1:787131606543:web:276d6bac72cbd3fa40257a",
  measurementId: "G-1SHMBCMTG2"
};

// تهيئة التطبيق
const app = initializeApp(firebaseConfig);

// تصدير الأدوات لباقي الموقع (مهم جداً لعمل الصفحات)
export const auth = getAuth(app);
export const db = getDatabase(app);
