import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "alwarsha-cf816.firebaseapp.com",
  databaseURL: "https://alwarsha-cf816-default-rtdb.firebaseio.com/",
  projectId: "alwarsha-cf816",
  storageBucket: "alwarsha-cf816.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

// التأكد من عدم تهيئة التطبيق أكثر من مرة
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
