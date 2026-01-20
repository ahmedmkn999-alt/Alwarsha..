import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  // 👇 ده المفتاح السليم (لاحظ الحروف: n, 8, F, O)
  apiKey: "AIzaSyAnxD8ecXF2bIkbQqI9PANfcEkCq2s4OXDg",
  
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

// تصدير الأدوات
export const auth = getAuth(app);
export const db = getDatabase(app);
