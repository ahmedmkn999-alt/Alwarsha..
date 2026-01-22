import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
// 👇 1. استيراد مكتبة الحماية (مهم جداً)
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

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

// 👇 2. تفعيل الحماية بالمفتاح اللي جبناه
if (typeof window !== "undefined") {
  const appCheck = initializeAppCheck(app, {
    // ده المفتاح اللي طلعناه من جوجل كلاود
    provider: new ReCaptchaEnterpriseProvider('6LdZJlIsAAAAAGK6574jzD_yjyxFuUFE-I2jXi5y'),
    isTokenAutoRefreshEnabled: true
  });
}

export const auth = getAuth(app);
export const db = getDatabase(app);
